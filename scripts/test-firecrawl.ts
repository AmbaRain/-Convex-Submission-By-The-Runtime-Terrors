import "dotenv/config";

import { searchOpportunities, toDevContractOutput } from "../src/firecrawl";

async function main() {
  console.log("\n========================================");
  console.log("OPPORTUNITY RADAR - FIRECRAWL TEST");
  console.log("========================================\n");

  const result = await searchOpportunities({
    query: "remote data science internships",
    filters: {
      category: "internship",
      location: "remote",
    },
    limit: 5,
  });

  console.log(`\nFound ${result.opportunities.length} opportunities.\n`);
  console.log("Full result (with debug meta):");
  console.log(JSON.stringify(result, null, 2));

  console.log("\nExact shape sent to the rest of the team (the contract):");
  console.log(JSON.stringify(toDevContractOutput(result), null, 2));
}

main().catch((error) => {
  console.error("\nFirecrawl test failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
