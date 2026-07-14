import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as toolkit from '../src/pixelperfect';

const source = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('v2 public contract', () => {
  it('keeps the runtime export surface unchanged', () => {
    expect(Object.keys(toolkit).sort()).toEqual(['destroy', 'init', 'toast']);
    const apiSource = source('src/pixelperfect.ts');
    expect(apiSource).toContain('export interface ToastOptions');
    expect(apiSource).toContain('export interface ToastHandle');
    expect(apiSource).not.toContain('data-site-');
  });

  it('keeps the fixed four-color palette', () => {
    const tokens = source('src/css/tokens.css');
    expect(tokens).toContain('--pp-color-screen: #e6f4a8;');
    expect(tokens).toContain('--pp-color-mid: #a9c46c;');
    expect(tokens).toContain('--pp-color-shadow: #526b46;');
    expect(tokens).toContain('--pp-color-ink: #16231d;');
  });

  it('preserves disabled and invalid geometry rules', () => {
    const actions = source('src/css/actions.css');
    const forms = source('src/css/forms.css');
    expect(actions).toMatch(/\.pp-button:disabled,[\s\S]*?box-shadow: none;[\s\S]*?transform: none;/);
    expect(forms).toMatch(/\.pp-input\[aria-invalid="true"\],[\s\S]*?border-style: double;/);
    expect(forms).not.toMatch(/aria-invalid[\s\S]{0,160}(?:padding|border-width|width|height):/);
  });

  it('gives inverted showcase surfaces explicit readable colors', () => {
    const showcase = source('src/site/site.css');
    expect(showcase).toContain('.site-invert .pp-tabs [role="tabpanel"]');
    expect(showcase).toContain('.site-invert .pp-dropdown__menu');
    expect(showcase).toContain('.site-invert .pp-breadcrumb');
    expect(showcase).toMatch(/\.site-invert \.site-demo,[\s\S]*?color: var\(--pp-color-ink\);/);
    expect(showcase).toMatch(/\.site-invert \.site-demo__stage,[\s\S]*?background-color: var\(--pp-color-screen\);/);
  });
});
