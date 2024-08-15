export type XpBridge = {
  "version": "0.1.0",
  "name": "xp_bridge",
  "instructions": [
    {
      "name": "transferLamports",
      "accounts": [
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "data",
          "type": {
            "defined": "TransferData"
          }
        }
      ]
    },
    {
      "name": "transferSplTokens",
      "accounts": [
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "data",
          "type": {
            "defined": "TransferData"
          }
        }
      ]
    }
  ],
  "types": [
    {
      "name": "TransferData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipients",
            "type": {
              "vec": {
                "defined": "TransferDataInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "TransferDataInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipient",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidRecipient",
      "msg": "Recipient address mismatch!"
    }
  ]
};

export const IDL: XpBridge = {
  "version": "0.1.0",
  "name": "xp_bridge",
  "instructions": [
    {
      "name": "transferLamports",
      "accounts": [
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "data",
          "type": {
            "defined": "TransferData"
          }
        }
      ]
    },
    {
      "name": "transferSplTokens",
      "accounts": [
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "data",
          "type": {
            "defined": "TransferData"
          }
        }
      ]
    }
  ],
  "types": [
    {
      "name": "TransferData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipients",
            "type": {
              "vec": {
                "defined": "TransferDataInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "TransferDataInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipient",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidRecipient",
      "msg": "Recipient address mismatch!"
    }
  ]
};
