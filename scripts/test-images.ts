/**
 * Image URL validation tests.
 *
 * Run: npx tsx scripts/test-images.ts
 *
 * This field decides what gets rendered into your storefront's HTML, so most
 * of these cases are about refusing things that are not images.
 */
import { checkImageUrl, parseImages } from "../src/lib/product-images";

let pass = 0, fail = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n         expected ${e}\n         actual   ${a}`); }
};

console.log("\naccepts real image URLs");
check("eBay CDN", checkImageUrl("https://i.ebayimg.com/images/g/abc/s-l1600.jpg").ok, true);
check("own domain", checkImageUrl("https://duvcollections.com/products/ch004.webp").ok, true);
check("subdomain of an allowed host", checkImageUrl("https://cdn.duvcollections.com/x.jpg").ok, true);
check("extensionless eBay URL", checkImageUrl("https://i.ebayimg.com/thumbs/images/g/xyz").ok, true);

console.log("\nrefuses dangerous input");
check("javascript: scheme", checkImageUrl("javascript:alert(1)").ok, false);
check("data: URI", checkImageUrl("data:image/png;base64,AAA").ok, false);
check("plain http", checkImageUrl("http://i.ebayimg.com/x.jpg").ok, false);
check("unknown host", checkImageUrl("https://evil.example.com/tracker.gif").ok, false);
check("host that merely contains ours", checkImageUrl("https://duvcollections.com.evil.net/x.jpg").ok, false);
check("script disguised as an image path", checkImageUrl("https://i.ebayimg.com/x.js").ok, false);
check("svg (can carry script)", checkImageUrl("https://i.ebayimg.com/x.svg").ok, false);
check("empty", checkImageUrl("").ok, false);
check("not a URL", checkImageUrl("just some text").ok, false);
check("absurdly long", checkImageUrl("https://i.ebayimg.com/" + "a".repeat(600)).ok, false);

console.log("\nparseImages tolerates junk");
check("valid JSON array", parseImages('["a","b"]'), ["a", "b"]);
check("empty string", parseImages(""), []);
check("null", parseImages(null), []);
check("malformed JSON", parseImages("{not json"), []);
check("JSON object, not array", parseImages('{"a":1}'), []);
check("array with non-strings", parseImages('["a",5,null,"b"]'), ["a", "b"]);
check("already an array", parseImages(["x"]), ["x"]);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
