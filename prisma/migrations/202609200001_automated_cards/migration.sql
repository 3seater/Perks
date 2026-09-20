-- Eligible earned rewards can be advanced by an operator-funded payment wallet.
ALTER TABLE "RewardLot" DROP CONSTRAINT "RewardLot_amounts_check";
ALTER TABLE "RewardLot" ADD CONSTRAINT "RewardLot_amounts_check" CHECK (
  "feeLamports" >= 0 AND "collectedLamports" >= 0 AND "collectedLamports" <= "feeLamports"
  AND "rewardBps" BETWEEN 0 AND 9999 AND "reservedLamports" >= 0 AND "spentLamports" >= 0
  AND "reservedLamports" + "spentLamports" <= floor("feeLamports" * "rewardBps" / 10000)
);
CREATE TABLE "CardCheckout" (
  "id" TEXT PRIMARY KEY, "walletAddress" TEXT NOT NULL, "brand" TEXT NOT NULL,
  "amount" TEXT NOT NULL, "currency" TEXT NOT NULL, "message" TEXT NOT NULL,
  "payloadEncrypted" TEXT NOT NULL, "maxDebitLamports" DECIMAL(78,0) NOT NULL CHECK ("maxDebitLamports">0),
  "expiresAt" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUOTED',
  "authorization" TEXT, "providerOrderId" TEXT UNIQUE, "providerEncrypted" TEXT,
  "paymentAddress" TEXT, "paymentLamports" DECIMAL(78,0), "paymentExpiresAt" TIMESTAMP(3),
  "signedTransaction" TEXT, "paymentSignature" TEXT UNIQUE, "lastValidBlockHeight" INTEGER,
  "actualDebitLamports" DECIMAL(78,0), "publicError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "CardCheckout_walletAddress_createdAt_idx" ON "CardCheckout"("walletAddress","createdAt");
CREATE INDEX "CardCheckout_status_createdAt_idx" ON "CardCheckout"("status","createdAt");
CREATE TABLE "PaymentWorkerState" (
  "id" TEXT PRIMARY KEY, "publicKey" TEXT NOT NULL, "heartbeatAt" TIMESTAMP(3) NOT NULL,
  "balanceLamports" DECIMAL(78,0) NOT NULL
);
