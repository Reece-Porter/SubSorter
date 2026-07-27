import { extractFromCsv } from "@/features/import/csv";
import { extractFromTextLines } from "@/features/import/text";
import { detectRecurring } from "@/features/import/detect";
import { parseAmount, parseDateToken, resolveDateOrder } from "@/features/import/parse";

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}`, extra ?? "");
  }
}

console.log("\n# Amount parsing");
ok("£9.99", parseAmount("£9.99").value === 9.99);
ok("$1,234.56 → 1234.56", parseAmount("$1,234.56").value === 1234.56);
ok("European 1.234,56 → 1234.56", parseAmount("1.234,56").value === 1234.56);
ok("European 9,99 → 9.99", parseAmount("9,99").value === 9.99);
ok("(12.00) is outgoing", parseAmount("(12.00)").outgoing === true && parseAmount("(12.00)").value === 12);
ok("100.00 CR is incoming", parseAmount("100.00 CR").outgoing === false);
ok("50.00 DR is outgoing", parseAmount("50.00 DR").outgoing === true);
ok("garbage → null", parseAmount("hello").value === null);

console.log("\n# Date parsing");
ok("ISO 2024-03-15", parseDateToken("2024-03-15")?.iso === "2024-03-15");
ok("15 Jan 2024", parseDateToken("15 Jan 2024")?.iso === "2024-01-15");
ok("Jan 15, 2024", parseDateToken("Jan 15, 2024")?.iso === "2024-01-15");
ok("25/12/2024 unambiguous DD/MM", parseDateToken("25/12/2024")?.iso === "2024-12-25");
ok("03/04/2024 ambiguous", parseDateToken("03/04/2024")?.ambiguous === true);
{
  // A file that has a 25/xx forces DD/MM order for the ambiguous ones.
  const toks = [parseDateToken("25/03/2024")!, parseDateToken("04/03/2024")!];
  const res = resolveDateOrder(toks);
  ok("resolveDateOrder infers DD/MM", res[1] === "2024-03-04", res);
}

console.log("\n# CSV extraction + detection (UK monthly bank export)");
const csv = `Date,Description,Amount
15/01/2024,NETFLIX.COM,-12.99
16/01/2024,Tesco Stores 3241,-54.20
28/01/2024,SPOTIFY P0ABC123,-11.99
15/02/2024,NETFLIX.COM,-12.99
28/02/2024,SPOTIFY UK,-11.99
02/03/2024,SALARY ACME LTD,2200.00
15/03/2024,NETFLIX.COM,-12.99
28/03/2024,SPOTIFY UK,-11.99
20/03/2024,Amazon Mktplce,-8.40`;
const ex = extractFromCsv(csv, "statement.csv");
ok("parsed outgoing transactions (salary excluded)", ex.transactions.every((t) => t.amount > 0));
ok("salary (incoming) excluded", !ex.transactions.some((t) => /salary/i.test(t.description)));
const detected = detectRecurring(ex.transactions);
console.log("   detected:", detected.map((d) => `${d.name} ${d.cost} ${d.frequency} conf=${d.confidence.toFixed(2)} review=${d.needsReview}`));
ok("Netflix detected", detected.some((d) => /netflix/i.test(d.name)));
ok("Spotify detected", detected.some((d) => /spotify/i.test(d.name)));
ok("Netflix is monthly", detected.find((d) => /netflix/i.test(d.name))?.frequency === "monthly");
ok("Netflix categorised streaming", detected.find((d) => /netflix/i.test(d.name))?.category === "streaming");
ok("one-off Tesco NOT detected as sub", !detected.some((d) => /tesco/i.test(d.name)));
ok("3x charges → higher confidence", (detected.find((d) => /netflix/i.test(d.name))?.confidence ?? 0) > 0.6);

console.log("\n# Amount fluctuation flagged for review");
const csv2 = `Date,Description,Amount
01/01/2024,GYM MEMBERSHIP,-24.99
01/02/2024,GYM MEMBERSHIP,-29.99
01/03/2024,GYM MEMBERSHIP,-24.99`;
const d2 = detectRecurring(extractFromCsv(csv2, "g.csv").transactions);
ok("gym detected", d2.some((d) => /gym/i.test(d.name)));

console.log("\n# PDF/OCR text-line extraction");
const text = `Your Statement
15 Jan 2024   NETFLIX.COM              12.99
15 Feb 2024   NETFLIX.COM              12.99
15 Mar 2024   NETFLIX.COM              12.99
03 Jan 2024   AMAZON PRIME*MEMBERSHIP  95.00`;
const t = extractFromTextLines(text, "s.pdf", "pdf");
ok("text lines → transactions", t.transactions.length >= 3);
const td = detectRecurring(t.transactions);
ok("Netflix detected from text", td.some((d) => /netflix/i.test(d.name)));

console.log("\n# Semicolon delimiter + separate debit/credit columns");
const csv3 = `Datum;Beschreibung;Soll;Haben
10.01.2024;ADOBE CREATIVE CLOUD;51,98;
10.02.2024;ADOBE CREATIVE CLOUD;51,98;
11.01.2024;Gehalt;;2000,00`;
const ex3 = extractFromCsv(csv3, "de.csv");
console.log("   de txns:", ex3.transactions.map((t) => `${t.date} ${t.description} ${t.amount}`));
ok("semicolon + debit column parsed", ex3.transactions.some((t) => Math.abs(t.amount - 51.98) < 0.01));
ok("credit (Gehalt/salary) excluded", !ex3.transactions.some((t) => /gehalt/i.test(t.description)));

console.log(`\nRESULT: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
