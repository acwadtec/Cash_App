// Performance optimization utilities

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const getCacheKey = (table: string, query: any): string => {
  return `${table}:${JSON.stringify(query)}`;
};

export const isExpired = (timestamp: number, ttl: number): boolean => {
  return Date.now() - timestamp > ttl;
};

export const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && !isExpired(cached.timestamp, cached.ttl)) {
    return cached.data;
  }
  return null;
};

export const setCachedData = (key: string, data: any, ttl: number = 5 * 60 * 1000) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

export const clearCache = (table?: string) => {
  if (table) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${table}:`)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Batch operations utility
export const batchOperations = async <T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
  }
  
  return results;
};

// Optimized query with caching
export const optimizedQuery = async <T = any>(
  supabase: any,
  table: string,
  query: any = {},
  options: { ttl?: number; select?: string } = {}
): Promise<{ data: T | null; error: any }> => {
  const { ttl = 5 * 60 * 1000, select = '*' } = options;
  const cacheKey = getCacheKey(table, query);

  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    return { data: cached, error: null };
  }

  try {
    let supabaseQuery = supabase.from(table).select(select);

    // Apply query filters
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          supabaseQuery = supabaseQuery.in(key, value);
        } else {
          supabaseQuery = supabaseQuery.eq(key, value);
        }
      }
    });

    const { data, error } = await supabaseQuery;

    if (!error && data) {
      // Cache the result
      setCachedData(cacheKey, data, ttl);
    }

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Performance monitoring
export const performanceMonitor = {
  start: (label: string) => {
    performance.mark(`${label}-start`);
  },
  end: (label: string) => {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    const measure = performance.getEntriesByName(label)[0];
    console.log(`${label}: ${measure.duration.toFixed(2)}ms`);
    return measure.duration;
  },
  measure: (label: string, fn: () => any) => {
    performanceMonitor.start(label);
    const result = fn();
    performanceMonitor.end(label);
    return result;
  },
  measureAsync: async (label: string, fn: () => Promise<any>) => {
    performanceMonitor.start(label);
    const result = await fn();
    performanceMonitor.end(label);
    return result;
  },
};

// Memory management
export const memoryManager = {
  getMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  },
  
  logMemoryUsage: () => {
    const usage = memoryManager.getMemoryUsage();
    if (usage) {
      console.log('Memory Usage:', {
        used: `${(usage.used / 1024 / 1024).toFixed(2)}MB`,
        total: `${(usage.total / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(usage.limit / 1024 / 1024).toFixed(2)}MB`,
        percentage: `${usage.percentage.toFixed(2)}%`,
      });
    }
  },
  
  cleanup: () => {
    // Clear cache if memory usage is high
    const usage = memoryManager.getMemoryUsage();
    if (usage && usage.percentage > 80) {
      console.warn('High memory usage detected, clearing cache');
      clearCache();
    }
  },
};

// Auto cleanup interval
setInterval(() => {
  memoryManager.cleanup();
}, 30000); // Check every 30 seconds 