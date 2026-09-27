/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MockNewsRepository } from './repositories/MockNewsRepository';
import type { NewsRepository } from '../types/repository';

/**
 * Universal News Repository Singleton.
 * In Phase 4, backed by MockNewsRepository.
 * In Phase 5, can be swapped with a real database repository without modifying frontend consumers.
 */
export const newsRepository: MockNewsRepository = new MockNewsRepository();

export default newsRepository;
export type { NewsRepository };
