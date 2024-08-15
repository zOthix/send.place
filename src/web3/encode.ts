import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";

export class TransferLamportsDataInfo {
  recipient: PublicKey;
  amount: BN;

  constructor(args: { recipient: PublicKey; amount: BN }) {
    this.recipient = args.recipient;
    this.amount = args.amount;
  }

  serialize(): Uint8Array {
    const recipientBuffer = this.recipient.toBuffer();
    const amountBuffer = Buffer.from(this.amount.toArray('le', 8));
    return Buffer.concat([recipientBuffer, amountBuffer]);
  }

  static deserialize(buffer: Uint8Array): TransferLamportsDataInfo {
    const recipient = new PublicKey(buffer.slice(0, 32));
    const amount = new BN(buffer.slice(32, 40), 'le');
    return new TransferLamportsDataInfo({ recipient, amount });
  }
}

export class TransferLamportsData {
  recipients: TransferLamportsDataInfo[];

  constructor(args: { recipients: TransferLamportsDataInfo[] }) {
    this.recipients = args.recipients;
  }

  serialize(): Uint8Array {
    const recipientsBuffers = this.recipients.map(recipient => recipient.serialize());
    return Buffer.concat(recipientsBuffers);
  }

  static deserialize(buffer: Uint8Array): TransferLamportsData {
    const recipients = [];
    let offset = 0;
    while (offset < buffer.length) {
      const recipientBuffer = buffer.slice(offset, offset + 40);
      recipients.push(TransferLamportsDataInfo.deserialize(recipientBuffer));
      offset += 40;
    }
    return new TransferLamportsData({ recipients });
  }
}
