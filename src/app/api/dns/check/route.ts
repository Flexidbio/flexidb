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

    const { address } = await lookup(domain);
    const isValid = address === serverIp;

    return NextResponse.json({
      isValid,
      serverIp,
      domainIp: address,
      message: isValid 
        ? "DNS is correctly configured" 
        : "DNS is not pointing to the correct IP address"
    });
  } catch (error) {
    if (error instanceof Error && (error as any).code === 'ENOTFOUND') {
      return NextResponse.json({
        isValid: false,
        serverIp: process.env.SERVER_IP,
        domainIp: null,
        message: "Domain not found. DNS record may not exist or still be propagating"
      });
    }

    return NextResponse.json({
      isValid: false,
      error: "DNS lookup failed",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
}