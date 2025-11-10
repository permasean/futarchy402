/**
 * Tests for Futarchy402Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Futarchy402Client } from '../../src/core/client.js';
import { mockPollListResponse, mockPollDetails, mockPosition, mockStats } from '../fixtures/polls.js';
import { MockFetchBuilder } from '../helpers/mock-fetch.js';

describe('Futarchy402Client', () => {
  let client: Futarchy402Client;
  let mockFetch: typeof fetch;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    client = new Futarchy402Client({
      apiBaseUrl: 'https://test-api.example.com',
    });
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('should use custom API URL', () => {
      expect(client.getBaseUrl()).toBe('https://test-api.example.com');
    });

    it('should use default API URL', () => {
      const defaultClient = new Futarchy402Client();
      expect(defaultClient.getBaseUrl()).toContain('futarchy402-api');
    });

    it('should use environment variable', () => {
      const originalEnv = process.env.FUTARCHY_API_URL;
      process.env.FUTARCHY_API_URL = 'https://env-api.example.com';

      const envClient = new Futarchy402Client();
      expect(envClient.getBaseUrl()).toBe('https://env-api.example.com');

      // Restore
      if (originalEnv) {
        process.env.FUTARCHY_API_URL = originalEnv;
      } else {
        delete process.env.FUTARCHY_API_URL;
      }
    });
  });

  describe('listPolls', () => {
    it('should list all polls', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('https://test-api.example.com/polls', {
        status: 200,
        body: mockPollListResponse,
      });
      global.fetch = mockBuilder.build();

      const result = await client.listPolls();

      expect(result.polls).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('https://test-api.example.com/polls\\?status=open', {
        status: 200,
        body: { ...mockPollListResponse, polls: [mockPollListResponse.polls[0]] },
      });
      global.fetch = mockBuilder.build();

      const result = await client.listPolls({ status: 'open' });

      expect(result.polls).toHaveLength(1);
      expect(result.polls[0].status).toBe('open');
    });

    it('should handle pagination', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('https://test-api.example.com/polls\\?limit=10&offset=20', {
        status: 200,
        body: mockPollListResponse,
      });
      global.fetch = mockBuilder.build();

      await client.listPolls({ limit: 10, offset: 20 });

      // Test passes if no error thrown
      expect(true).toBe(true);
    });

    it('should throw on API error', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('https://test-api.example.com/polls', {
        status: 500,
        statusText: 'Internal Server Error',
      });
      global.fetch = mockBuilder.build();

      await expect(client.listPolls()).rejects.toThrow('Failed to list polls');
    });
  });

  describe('getPoll', () => {
    it('should get poll details', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('https://test-api.example.com/poll/test-poll-1', {
        status: 200,
        body: mockPollDetails,
      });
      global.fetch = mockBuilder.build();

      const result = await client.getPoll('test-poll-1');

      expect(result.id).toBe('test-poll-1');
      expect(result.votes).toHaveLength(2);
    });

    it('should throw on 404', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('https://test-api.example.com/poll/nonexistent', {
        status: 404,
      });
      global.fetch = mockBuilder.build();

      await expect(client.getPoll('nonexistent')).rejects.toThrow('Poll not found');
    });
  });

  describe('getPosition', () => {
    it('should get position details', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse(
        'https://test-api.example.com/poll/test-poll-1/position\\?voter_pubkey=Voter1',
        {
          status: 200,
          body: mockPosition,
        }
      );
      global.fetch = mockBuilder.build();

      const result = await client.getPosition('test-poll-1', 'Voter1');

      expect(result.poll_id).toBe('test-poll-1');
      expect(result.vote_side).toBe('yes');
    });

    it('should throw on missing voter_pubkey', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse(
        'https://test-api.example.com/poll/test-poll-1/position\\?voter_pubkey=',
        {
          status: 400,
        }
      );
      global.fetch = mockBuilder.build();

      await expect(client.getPosition('test-poll-1', '')).rejects.toThrow();
    });

    it('should throw on no position found', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse(
        'https://test-api.example.com/poll/test-poll-1/position\\?voter_pubkey=NoVoter',
        {
          status: 404,
        }
      );
      global.fetch = mockBuilder.build();

      await expect(client.getPosition('test-poll-1', 'NoVoter')).rejects.toThrow(
        'No position found'
      );
    });
  });

  describe('getStats', () => {
    it('should get platform stats', async () => {
      const mockBuilder = new MockFetchBuilder();
      mockBuilder.addResponse('https://test-api.example.com/stats', {
        status: 200,
        body: mockStats,
      });
      global.fetch = mockBuilder.build();

      const result = await client.getStats();

      expect(result.active_polls).toBe(5);
      expect(result.total_projects).toBe(12);
      expect(result.total_proposals).toBe(27);
    });
  });
});
