import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {safeSettings,defaults} from '../src/model';
import {readFont,maxFontBytes,embeddedFontCss} from '../src/fonts';

describe('Custom fonts and project typography',()=>{
  it('preserves a project font and independent sizes while migrating older projects',()=>{
    const fontData='data:font/woff2;base64,d09GMgAAAAAA';
    const saved=safeSettings({...defaults,fontData,fontName:'فونت من.woff2',fontSize:42,titleFontSize:54,subtitleFontSize:20,valueFontSize:28});
    assert.equal(saved.fontData,fontData);assert.equal(saved.fontName,'فونت من.woff2');assert.equal(saved.titleFontSize,54);assert.equal(saved.valueFontSize,28);
    assert.equal(safeSettings({fontSize:21}).titleFontSize,25);
    assert.equal(safeSettings({fontData:'https://untrusted.example/font.woff2',fontSize:999}).fontData,'');
    assert.equal(safeSettings({fontSize:999}).fontSize,17);
  });
  it('rejects renamed non-fonts and oversized files before browser loading',async()=>{
    await assert.rejects(readFont(new File(['plain text'],'bad.woff2')),/مطابقت/);
    await assert.rejects(readFont(new File(['font'],'font.exe')),/WOFF/);
    await assert.rejects(readFont(new File([new Uint8Array(maxFontBytes+1)],'large.ttf')),/۲ مگابایت/);
  });
  it('embeds the selected font as a data URL for portable SVG output',()=>{
    const css=embeddedFontCss('data:font/ttf;base64,AAEAAAAA',true);
    assert.ok(css.includes('font-family:VoronoiUserFont'));
    assert.ok(css.includes('format("truetype")'));
    assert.throws(()=>embeddedFontCss('data:text/html;base64,AAEAAAAA',true));
  });
});
