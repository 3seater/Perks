//! Minimal authority-controlled signer for Perks' master PDA.
//! Build with PERKS_ADMIN_PUBKEY set to the treasury's on-chain signer.
//! No public initialization exists. Never use a user wallet as the creator.
use solana_program::{account_info::{next_account_info, AccountInfo}, entrypoint, entrypoint::ProgramResult,
    instruction::{AccountMeta, Instruction}, program::invoke_signed, program_error::ProgramError,
    pubkey::Pubkey, system_instruction, system_program, hash::hash};
use std::str::FromStr;
entrypoint!(process_instruction);
pub fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let mut iter = accounts.iter();
    let authority = next_account_info(&mut iter)?;
    let vault = next_account_info(&mut iter)?;
    let admin = Pubkey::from_str(env!("PERKS_ADMIN_PUBKEY")).map_err(|_| ProgramError::InvalidArgument)?;
    if !authority.is_signer || authority.key != &admin { return Err(ProgramError::MissingRequiredSignature); }
    let (expected, bump) = Pubkey::find_program_address(&[b"perks-vault"], program_id);
    if vault.key != &expected || vault.owner != &system_program::id() || !vault.data_is_empty() { return Err(ProgramError::InvalidAccountData); }
    let seeds: &[&[u8]] = &[b"perks-vault", &[bump]];
    match data.first() {
        Some(0) => {
            // Sweep only to the compiled treasury authority. Fund the PDA with SOL first.
            let system = next_account_info(&mut iter)?;
            if system.key != &system_program::id() || data.len() != 9 { return Err(ProgramError::InvalidInstructionData); }
            let amount = u64::from_le_bytes(data[1..9].try_into().unwrap());
            invoke_signed(&system_instruction::transfer(vault.key, authority.key, amount), &[vault.clone(),authority.clone(),system.clone()], &[seeds])
        },
        Some(1) => {
            // CPI only to the authenticated Pump / Pump AMM collection instructions.
            let target = next_account_info(&mut iter)?;
            let pump = Pubkey::from_str("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P").unwrap();
            let amm = Pubkey::from_str("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA").unwrap();
            if !target.executable || (target.key != &pump && target.key != &amm) || data.len() < 9 { return Err(ProgramError::IncorrectProgramId); }
            let method = if target.key == &pump { "global:collect_creator_fee_v2" } else { "global:collect_coin_creator_fee" };
            if data[1..9] != hash(method.as_bytes()).to_bytes()[..8] { return Err(ProgramError::InvalidInstructionData); }
            let remaining: Vec<AccountInfo> = iter.cloned().collect();
            if !remaining.iter().any(|a| a.key == vault.key) { return Err(ProgramError::NotEnoughAccountKeys); }
            let metas = remaining.iter().map(|a| AccountMeta {pubkey:*a.key,is_writable:a.is_writable,is_signer:a.is_signer || a.key == vault.key}).collect();
            let ix = Instruction {program_id:*target.key,accounts:metas,data:data[1..].to_vec()};
            let mut infos = remaining; infos.push(target.clone());
            invoke_signed(&ix, &infos, &[seeds])
        },
        Some(2) => {
            // Unwrap only the vault's own native-SOL token account, into the same vault.
            let source = next_account_info(&mut iter)?;
            let token = next_account_info(&mut iter)?;
            let token_id = Pubkey::from_str("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
            let native_mint = Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap();
            if token.key != &token_id || source.owner != &token_id || data.len() != 1 { return Err(ProgramError::IncorrectProgramId); }
            {
                let bytes = source.try_borrow_data()?;
                if bytes.len() != 165 || bytes[0..32] != native_mint.to_bytes() || bytes[32..64] != vault.key.to_bytes() { return Err(ProgramError::InvalidAccountData); }
            }
            let ix = Instruction { program_id:token_id, accounts:vec![AccountMeta::new(*source.key,false),AccountMeta::new(*vault.key,false),AccountMeta::new_readonly(*vault.key,true)],data:vec![9] };
            invoke_signed(&ix,&[source.clone(),vault.clone(),token.clone()],&[seeds])
        },
        _ => Err(ProgramError::InvalidInstructionData)
    }
}
