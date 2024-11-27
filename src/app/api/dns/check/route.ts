import { NextResponse } from "next/server";
import dns from "dns";
import { promisify } from "util";

const lookup = promisify(dns.lookup);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  try {
    const serverIp = process.env.SERVER_IP;
    if (!serverIp) {
      throw new Error("Server IP not configured");
    }

    // Check all DNS records (A records)
    const resolveDns = promisify(dns.resolve4);
    try {
      const addresses = await resolveDns(domain);
      const isValid = addresses.includes(serverIp);

      return NextResponse.json({
        isValid,
        serverIp,
        domainIp: addresses[0],
        allIps: addresses,
        message: isValid 
          ? "DNS is correctly configured" 
          : `DNS is not pointing to the correct IP address. Please add an A record pointing to ${serverIp}`
      });
    } catch (dnsError) {
      return NextResponse.json({
        isValid: false,
        serverIp,
        domainIp: null,
        message: "No DNS records found. Please add an A record for your domain."
      });
    }
  } catch (error) {
    return NextResponse.json({
      isValid: false,
      error: "DNS lookup failed",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
}