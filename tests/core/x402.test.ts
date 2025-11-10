/**
 * Tests for x402 payment-gated voting protocol
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeVote } from '../../src/core/x402.js';
import { mockVoteResult, mockX402PaymentRequirements } from '../fixtures/polls.js';
import { MockFetchBuilder } from '../helpers/mock-fetch.js';
import { Keypair } from '@solana/web3.js';

describe('x402 Payment Protocol', () => {
  let originalFetch: typeof fetch;
  let testKeypair: Keypair;
  let testPrivateKey: string;

  beforeEach(() => {
    originalFetch = global.fetch;
    // Generate a test keypair
    testKeypair = Keypair.generate();
    // Convert to base58 (simplified - in real code would use bs58)
    testPrivateKey = Buffer.from(testKeypair.secretKey).toString('base64');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('executeVote', () => {
    it('should successfully execute vote with x402 protocol', async () => {
      const mockBuilder = new MockFetchBuilder();

      // Step 1: Initial vote request returns 402
      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*', {
        status: 402,
        headers: {
          'x-payment-required': JSON.stringify(mockX402PaymentRequirements),
        },
      });

      // Step 2: Facilitator returns unsigned transaction
      mockBuilder.addResponse('.*/facilitator/settle', {
        status: 200,
        body: {
          transaction: Buffer.from('mock-transaction-data').toString('base64'),
        },
      });

      // Step 3: Vote submission with payment succeeds
      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*', {
        status: 200,
        body: mockVoteResult,
      });

      global.fetch = mockBuilder.build();

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        slippage: 0.05,
        apiBaseUrl: 'https://test-api.example.com',
        facilitatorUrl: 'https://test-facilitator.example.com',
      });

      expect(result.success).toBe(true);
      expect(result.vote_id).toBe('vote-123');
      expect(result.transaction_signature).toBeDefined();
    });

    it('should handle 400 invalid request', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*', {
        status: 400,
        body: { error: 'Invalid side parameter' },
      });
      global.fetch = mockBuilder.build();

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid vote request');
    });

    it('should handle 403 duplicate vote', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*', {
        status: 403,
      });
      global.fetch = mockBuilder.build();

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate vote');
    });

    it('should handle 404 poll not found', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*/poll/nonexistent/vote.*', {
        status: 404,
      });
      global.fetch = mockBuilder.build();

      const result = await executeVote({
        pollId: 'nonexistent',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Poll not found');
    });

    it('should handle missing X-Payment-Required header', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*', {
        status: 402,
        // No X-Payment-Required header
      });
      global.fetch = mockBuilder.build();

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing X-Payment-Required header');
    });

    it('should handle facilitator errors', async () => {
      const mockBuilder = new MockFetchBuilder();

      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*', {
        status: 402,
        headers: {
          'x-payment-required': JSON.stringify(mockX402PaymentRequirements),
        },
      });

      mockBuilder.addResponse('.*/facilitator/settle', {
        status: 500,
        body: { error: 'Facilitator error' },
      });

      global.fetch = mockBuilder.build();

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
        facilitatorUrl: 'https://test-facilitator.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Facilitator error');
    });

    it('should handle 409 slippage exceeded', async () => {
      const mockBuilder = new MockFetchBuilder();

      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*', {
        status: 402,
        headers: {
          'x-payment-required': JSON.stringify(mockX402PaymentRequirements),
        },
      });

      mockBuilder.addResponse('.*/facilitator/settle', {
        status: 200,
        body: {
          transaction: Buffer.from('mock-transaction-data').toString('base64'),
        },
      });

      // Payment submission fails with 409
      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*', {
        status: 409,
      });

      global.fetch = mockBuilder.build();

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
        facilitatorUrl: 'https://test-facilitator.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slippage exceeded');
    });

    it('should use default slippage if not provided', async () => {
      const mockBuilder = new MockFetchBuilder();

      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*slippage=0.05', {
        status: 402,
        headers: {
          'x-payment-required': JSON.stringify(mockX402PaymentRequirements),
        },
      });

      mockBuilder.addResponse('.*/facilitator/settle', {
        status: 200,
        body: {
          transaction: Buffer.from('mock-transaction-data').toString('base64'),
        },
      });

      mockBuilder.addResponse('.*/poll/test-poll-1/vote.*', {
        status: 200,
        body: mockVoteResult,
      });

      global.fetch = mockBuilder.build();

      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: testPrivateKey,
        apiBaseUrl: 'https://test-api.example.com',
        facilitatorUrl: 'https://test-facilitator.example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should handle invalid wallet private key', async () => {
      const result = await executeVote({
        pollId: 'test-poll-1',
        side: 'yes',
        walletPrivateKey: 'invalid-key',
        apiBaseUrl: 'https://test-api.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
