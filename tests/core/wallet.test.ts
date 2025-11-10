/**
 * Tests for wallet utilities
 */

import { describe, it, expect } from 'vitest';
import { validatePublicKey, getSolanaRpcUrl } from '../../src/core/wallet.js';

describe('Wallet Utilities', () => {
  describe('validatePublicKey', () => {
    it('should validate correct Solana public keys', () => {
      const validKeys = [
        '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        '11111111111111111111111111111111',
      ];

      validKeys.forEach((key) => {
        expect(validatePublicKey(key)).toBe(true);
      });
    });

    it('should reject invalid public keys', () => {
      const invalidKeys = [
        'invalid',
        '123',
        '',
        'not-a-valid-pubkey',
        '0x1234567890abcdef', // Ethereum style
      ];

      invalidKeys.forEach((key) => {
        expect(validatePublicKey(key)).toBe(false);
      });
    });
  });

  describe('getSolanaRpcUrl', () => {
    it('should return devnet RPC URL', () => {
      const url = getSolanaRpcUrl('solana-devnet');
      expect(url).toContain('devnet');
    });

    it('should return mainnet RPC URL', () => {
      const url = getSolanaRpcUrl('solana-mainnet');
      expect(url).toContain('mainnet');
    });

    it('should use environment variable if set', () => {
      const originalDevnet = process.env.SOLANA_RPC_DEVNET;
      process.env.SOLANA_RPC_DEVNET = 'https://custom-devnet.example.com';

      const url = getSolanaRpcUrl('solana-devnet');
      expect(url).toBe('https://custom-devnet.example.com');

      // Restore
      if (originalDevnet) {
        process.env.SOLANA_RPC_DEVNET = originalDevnet;
      } else {
        delete process.env.SOLANA_RPC_DEVNET;
      }
    });

    it('should throw error for unsupported network', () => {
      expect(() => getSolanaRpcUrl('unsupported-network')).toThrow('Unsupported network');
    });
  });
});
