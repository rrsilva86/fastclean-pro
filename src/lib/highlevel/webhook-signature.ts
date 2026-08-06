import { createVerify, verify } from "crypto";

const highLevelEd25519PublicKey = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=
-----END PUBLIC KEY-----`;

export type HighLevelWebhookSignatureResult = {
  ok: boolean;
  provider: "x-ghl-signature" | "x-wh-signature" | "missing";
  reason?: string;
};

function verifyGhlSignature(rawBody: string, signature: string) {
  if (!signature || signature === "N/A") {
    return false;
  }

  return verify(null, Buffer.from(rawBody, "utf8"), highLevelEd25519PublicKey, Buffer.from(signature, "base64"));
}

function verifyLegacyWhSignature(rawBody: string, signature: string, publicKey: string) {
  if (!signature || signature === "N/A" || !publicKey) {
    return false;
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(rawBody, "utf8");
  verifier.end();

  return verifier.verify(publicKey, signature, "base64");
}

export function verifyHighLevelWebhookSignature(headers: Headers, rawBody: string): HighLevelWebhookSignatureResult {
  const ghlSignature = headers.get("x-ghl-signature");

  if (ghlSignature) {
    try {
      return verifyGhlSignature(rawBody, ghlSignature)
        ? { ok: true, provider: "x-ghl-signature" }
        : { ok: false, provider: "x-ghl-signature", reason: "ed25519_verification_failed" };
    } catch {
      return { ok: false, provider: "x-ghl-signature", reason: "ed25519_verification_error" };
    }
  }

  const whSignature = headers.get("x-wh-signature");

  if (whSignature) {
    try {
      return verifyLegacyWhSignature(rawBody, whSignature, process.env.HIGHLEVEL_LEGACY_WEBHOOK_RSA_PUBLIC_KEY ?? "")
        ? { ok: true, provider: "x-wh-signature" }
        : { ok: false, provider: "x-wh-signature", reason: "rsa_verification_failed" };
    } catch {
      return { ok: false, provider: "x-wh-signature", reason: "rsa_verification_error" };
    }
  }

  return { ok: false, provider: "missing", reason: "missing_signature_header" };
}
