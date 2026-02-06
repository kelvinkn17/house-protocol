// one-off script to recompute VaultSnapshot.sharePrice with correct decimals
// sUSDH (totalSupply) is 9 decimals, USDH (totalAssets) is 6 decimals
import { PrismaClient } from '../prisma/generated';
import { PrismaPg } from '@prisma/adapter-pg';
import { formatUnits } from 'viem';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const snapshots = await (prisma as any).vaultSnapshot.findMany();
  console.log(`Found ${snapshots.length} snapshots to fix`);

  let fixed = 0;
  for (const snap of snapshots) {
    const totalAssets = BigInt(snap.totalAssets);
    const totalSupply = BigInt(snap.totalSupply);

    const newPrice = totalSupply > 0n
      ? Number(formatUnits(totalAssets, 6)) / Number(formatUnits(totalSupply, 9))
      : 1.0;

    if (Math.abs(newPrice - snap.sharePrice) > 0.000001) {
      await (prisma as any).vaultSnapshot.update({
        where: { id: snap.id },
        data: { sharePrice: newPrice },
      });
      console.log(`  ${snap.id}: ${snap.sharePrice} -> ${newPrice}`);
      fixed++;
    }
  }

  console.log(`Done. Fixed ${fixed}/${snapshots.length} snapshots.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
