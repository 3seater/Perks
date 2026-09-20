-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Token" (
    "mintAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "metadataUri" TEXT NOT NULL,
    "creatorWallet" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "launchSignature" TEXT,
    "launchSlot" BIGINT,
    "accumulatedIndex" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "totalSupply" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "feeLamports" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "curveProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("mintAddress")
);

-- CreateTable
CREATE TABLE "UserTokenCheckpoint" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "balance" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "lastIndex" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "accruedScaled" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTokenCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "debitLamports" DECIMAL(78,0) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionOrder" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "customIdentifier" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "debitLamports" DECIMAL(78,0) NOT NULL,
    "reloadlyOrderId" TEXT,
    "voucherEncrypted" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedemptionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionDebit" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "lamports" DECIMAL(78,0) NOT NULL,

    CONSTRAINT "RedemptionDebit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasurySwap" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signedTransaction" TEXT NOT NULL,
    "lastValidBlockHeight" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREPARED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasurySwap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChainCursor" (
    "id" TEXT NOT NULL DEFAULT 'solana',
    "slot" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChainReceipt" (
    "signature" TEXT NOT NULL,
    "slot" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChainReceipt_pkey" PRIMARY KEY ("signature")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "volumeLamports" DECIMAL(78,0) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_launchSignature_key" ON "Token"("launchSignature");

-- CreateIndex
CREATE UNIQUE INDEX "UserTokenCheckpoint_walletAddress_tokenMint_key" ON "UserTokenCheckpoint"("walletAddress", "tokenMint");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionOrder_challengeId_key" ON "RedemptionOrder"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionOrder_customIdentifier_key" ON "RedemptionOrder"("customIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionOrder_reloadlyOrderId_key" ON "RedemptionOrder"("reloadlyOrderId");

-- CreateIndex
CREATE INDEX "RedemptionOrder_walletAddress_createdAt_idx" ON "RedemptionOrder"("walletAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionDebit_orderId_tokenMint_key" ON "RedemptionDebit"("orderId", "tokenMint");

-- CreateIndex
CREATE UNIQUE INDEX "TreasurySwap_signature_key" ON "TreasurySwap"("signature");

-- CreateIndex
CREATE INDEX "Trade_tokenMint_occurredAt_idx" ON "Trade"("tokenMint", "occurredAt");

-- AddForeignKey
ALTER TABLE "UserTokenCheckpoint" ADD CONSTRAINT "UserTokenCheckpoint_tokenMint_fkey" FOREIGN KEY ("tokenMint") REFERENCES "Token"("mintAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionOrder" ADD CONSTRAINT "RedemptionOrder_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionDebit" ADD CONSTRAINT "RedemptionDebit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RedemptionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_tokenMint_fkey" FOREIGN KEY ("tokenMint") REFERENCES "Token"("mintAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
