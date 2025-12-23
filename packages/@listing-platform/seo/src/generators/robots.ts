/**
 * Robots.txt Generator
 */

import type { RobotsTxtConfig } from '../types';

export interface RobotsGeneratorConfig {
  siteUrl: string;
  defaultRules?: RobotsTxtConfig[];
}

/**
 * Robots.txt Generator
 */
export class RobotsTxtGenerator {
  private config: RobotsGeneratorConfig;
  private rules: RobotsTxtConfig[] = [];
  
  constructor(config: RobotsGeneratorConfig) {
    this.config = config;
    
    // Add default rules if provided
    if (config.defaultRules) {
      this.rules = [...config.defaultRules];
    }
  }
  
  /**
   * Add a rule for a specific user agent
   */
  addRule(rule: RobotsTxtConfig): this {
    this.rules.push(rule);
    return this;
  }
  
  /**
   * Add default rules for all user agents
   */
  addDefaultRules(options?: {
    disallow?: string[];
    allow?: string[];
    crawlDelay?: number;
  }): this {
    this.rules.push({
      userAgent: '*',
      allow: options?.allow || ['/'],
      disallow: options?.disallow || [],
      crawlDelay: options?.crawlDelay,
      sitemap: `${this.config.siteUrl}/sitemap.xml`,
    });
    return this;
  }
  
  /**
   * Block specific paths from all bots
   */
  blockPaths(paths: string[]): this {
    const existingAllRule = this.rules.find(r => r.userAgent === '*');
    
    if (existingAllRule) {
      existingAllRule.disallow = [
        ...(existingAllRule.disallow || []),
        ...paths,
      ];
    } else {
      this.rules.push({
        userAgent: '*',
        disallow: paths,
      });
    }
    
    return this;
  }
  
  /**
   * Block AI crawlers (GPTBot, Google-Extended, etc.)
   */
  blockAICrawlers(): this {
    const aiCrawlers = [
      'GPTBot',
      'ChatGPT-User',
      'Google-Extended',
      'CCBot',
      'anthropic-ai',
      'Claude-Web',
    ];
    
    aiCrawlers.forEach(crawler => {
      this.rules.push({
        userAgent: crawler,
        disallow: ['/'],
      });
    });
    
    return this;
  }
  
  /**
   * Add rate limiting for specific bots
   */
  addCrawlDelay(userAgent: string, delay: number): this {
    const existingRule = this.rules.find(r => r.userAgent === userAgent);
    
    if (existingRule) {
      existingRule.crawlDelay = delay;
    } else {
      this.rules.push({
        userAgent,
        crawlDelay: delay,
      });
    }
    
    return this;
  }
  
  /**
   * Generate robots.txt content
   */
  generate(): string {
    // Ensure we have at least one rule
    if (this.rules.length === 0) {
      this.addDefaultRules();
    }
    
    const lines: string[] = [];
    
    this.rules.forEach((rule, index) => {
      if (index > 0) lines.push('');
      
      lines.push(`User-agent: ${rule.userAgent || '*'}`);
      
      if (rule.allow) {
        rule.allow.forEach(path => lines.push(`Allow: ${path}`));
      }
      
      if (rule.disallow) {
        rule.disallow.forEach(path => lines.push(`Disallow: ${path}`));
      }
      
      if (rule.crawlDelay !== undefined) {
        lines.push(`Crawl-delay: ${rule.crawlDelay}`);
      }
      
      if (rule.sitemap) {
        lines.push(`Sitemap: ${rule.sitemap}`);
      }
    });
    
    // Add sitemap at the end if not already included
    const hasSitemap = this.rules.some(r => r.sitemap);
    if (!hasSitemap) {
      lines.push('');
      lines.push(`Sitemap: ${this.config.siteUrl}/sitemap.xml`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Generate for Next.js robots.ts
   */
  toNextRobots(): {
    rules: Array<{
      userAgent: string | string[];
      allow?: string | string[];
      disallow?: string | string[];
      crawlDelay?: number;
    }>;
    sitemap: string;
  } {
    return {
      rules: this.rules.map(rule => ({
        userAgent: rule.userAgent || '*',
        allow: rule.allow,
        disallow: rule.disallow,
        crawlDelay: rule.crawlDelay,
      })),
      sitemap: `${this.config.siteUrl}/sitemap.xml`,
    };
  }
  
  /**
   * Create a production-ready robots.txt with sensible defaults
   */
  static production(siteUrl: string): RobotsTxtGenerator {
    return new RobotsTxtGenerator({ siteUrl })
      .addDefaultRules({
        allow: ['/'],
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '*.json$',
        ],
      })
      .blockAICrawlers();
  }
  
  /**
   * Create a development robots.txt that blocks all bots
   */
  static development(siteUrl: string): RobotsTxtGenerator {
    return new RobotsTxtGenerator({ siteUrl })
      .addRule({
        userAgent: '*',
        disallow: ['/'],
      });
  }
}

