CREATE TABLE "RewardPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "rewardBps" INTEGER NOT NULL CHECK ("rewardBps" BETWEEN 0 AND 9999),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RewardLot" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "eventIndex" INTEGER NOT NULL,
    "venue" TEXT NOT NULL,
    "slot" BIGINT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "walletAddress" TEXT,
    "attribution" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "feeLamports" DECIMAL(78,0) NOT NULL,
    "rewardBps" INTEGER NOT NULL,
    "collectedLamports" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "reservedLamports" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "spentLamports" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardCollection" (
    "id" TEXT NOT NULL,
    "slot" BIGINT NOT NULL,
    "venue" TEXT NOT NULL,
    "receivedLamports" DECIMAL(78,0) NOT NULL,
    "allocatedLamports" DECIMAL(78,0) NOT NULL,
    "evidence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardFunding" (
    "collectionId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "lamports" DECIMAL(78,0) NOT NULL,

    CONSTRAINT "RewardFunding_pkey" PRIMARY KEY ("collectionId","lotId")
);

-- CreateTable
CREATE TABLE "RewardReservation" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountLamports" DECIMAL(78,0) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "settlementReference" TEXT,
    "resolutionEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardAllocation" (
    "reservationId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "lamports" DECIMAL(78,0) NOT NULL,

    CONSTRAINT "RewardAllocation_pkey" PRIMARY KEY ("reservationId","lotId")
);

-- CreateIndex
CREATE INDEX "RewardLot_walletAddress_slot_idx" ON "RewardLot"("walletAddress", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "RewardLot_signature_venue_eventIndex_key" ON "RewardLot"("signature", "venue", "eventIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RewardReservation_settlementReference_key" ON "RewardReservation"("settlementReference");

-- CreateIndex
CREATE INDEX "RewardReservation_walletAddress_status_idx" ON "RewardReservation"("walletAddress", "status");

-- AddForeignKey
ALTER TABLE "RewardFunding" ADD CONSTRAINT "RewardFunding_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "RewardCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardFunding" ADD CONSTRAINT "RewardFunding_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "RewardLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAllocation" ADD CONSTRAINT "RewardAllocation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "RewardReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardAllocation" ADD CONSTRAINT "RewardAllocation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "RewardLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce solvency even when a writer bypasses the application helpers.
ALTER TABLE "RewardLot" ADD CONSTRAINT "RewardLot_amounts_check" CHECK (
  "feeLamports" >= 0 AND "collectedLamports" >= 0 AND "collectedLamports" <= "feeLamports"
  AND "rewardBps" BETWEEN 0 AND 9999 AND "reservedLamports" >= 0 AND "spentLamports" >= 0
  AND "reservedLamports" + "spentLamports" <= floor("collectedLamports" * "rewardBps" / 10000)
);
ALTER TABLE "RewardLot" ADD CONSTRAINT "RewardLot_provenance_check" CHECK (
  "slot" >= 0 AND "eventIndex" >= 0 AND "venue" IN ('CURVE','AMM') AND "side" IN ('BUY','SELL')
  AND (("walletAddress" IS NULL AND "attribution" = 'UNRESOLVED')
    OR ("walletAddress" IS NOT NULL AND "attribution" = 'PROTOCOL_USER_SIGNER'))
);
ALTER TABLE "RewardCollection" ADD CONSTRAINT "RewardCollection_amounts_check" CHECK (
  "receivedLamports" > 0 AND "allocatedLamports" >= 0 AND "allocatedLamports" <= "receivedLamports"
  AND "slot" >= 0 AND "venue" IN ('CURVE','AMM') AND length(trim("evidence")) > 0
);
ALTER TABLE "RewardFunding" ADD CONSTRAINT "RewardFunding_positive_check" CHECK ("lamports" > 0);
ALTER TABLE "RewardAllocation" ADD CONSTRAINT "RewardAllocation_positive_check" CHECK ("lamports" > 0);
ALTER TABLE "RewardReservation" ADD CONSTRAINT "RewardReservation_state_check" CHECK (
  "amountLamports" > 0 AND "kind" IN ('CARD','SOL') AND "status" IN ('RESERVED','SUBMITTING','SPENT','RELEASED')
  AND (("status" = 'SPENT' AND "settlementReference" IS NOT NULL) OR ("status" <> 'SPENT' AND "settlementReference" IS NULL))
  AND (("status" IN ('SPENT','RELEASED') AND "resolutionEvidence" IS NOT NULL AND length(trim("resolutionEvidence")) > 0)
    OR ("status" IN ('RESERVED','SUBMITTING') AND "resolutionEvidence" IS NULL))
);
