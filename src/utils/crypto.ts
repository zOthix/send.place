export class CryptoService {
  private salt: string;
  private keySize: number = 256; // Key size in bits
  private blockSize: number = 16; // Block size for AES-CBC

  constructor(salt: string) {
    this.salt = salt;
  }

  // Convert the salt to a Uint8Array
  private getSalt(): Uint8Array {
    return new TextEncoder().encode(this.salt);
  }

  // Derive a key from the salt using PBKDF2
  private async deriveKey(): Promise<CryptoKey> {
    const salt = this.getSalt();
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode("dummy-password"), // Dummy password
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-CBC", length: this.keySize },
      true,
      ["encrypt", "decrypt"]
    );
  }

  // Encrypt the text
  public async encrypt(
    text: string
  ): Promise<{ encrypted: string; iv: string }> {
    const key = await this.deriveKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Padding data
    const paddedData = this.padData(data);

    // Using a zero-filled IV for deterministic encryption
    const iv = new Uint8Array(this.blockSize);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      key,
      paddedData
    );

    return {
      encrypted: window.btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: window.btoa(String.fromCharCode(...iv)),
    };
  }

  // Decrypt the text
  public async decrypt(encryptedText: string): Promise<string> {
    const key = await this.deriveKey();
    const encryptedData = new Uint8Array(
      [...window.atob(encryptedText)].map((char) => char.charCodeAt(0))
    );

    // Using a zero-filled IV for deterministic decryption
    const iv = new Uint8Array(this.blockSize);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      key,
      encryptedData.buffer
    );

    // Removing padding
    const data = new Uint8Array(decrypted);
    return new TextDecoder().decode(this.unpadData(data));
  }

  // PKCS7 padding function
  private padData(data: Uint8Array): Uint8Array {
    const padding = this.blockSize - (data.length % this.blockSize);
    const paddedData = new Uint8Array(data.length + padding);
    paddedData.set(data);
    paddedData.fill(padding, data.length);
    return paddedData;
  }

  // Remove PKCS7 padding
  private unpadData(data: Uint8Array): Uint8Array {
    const padding = data[data.length - 1];
    return data.slice(0, data.length - padding);
  }
}

//   // Example usage:
  const cryptoService = new CryptoService('your-salt-string');

  async function example() {
    const plaintext = 'Hello, World!';
    const { encrypted } = await cryptoService.encrypt(plaintext);
    console.log('Encrypted:', encrypted);

    const decrypted = await cryptoService.decrypt(encrypted);
    console.log('Decrypted:', decrypted);
  }

  example();
