import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {defineConfig, type Plugin} from 'vite';

import {cdoResolverPlugin} from './src/devhost/cdoResolverPlugin';

// Single-file static build of the dev host, for sharing the prototype as one
// self-contained .html with no server, no backend, and no second request.
//
// Distinct from vite.config.ts, which produces the *library* the Studio host
// consumes: that build externalizes React/MUI/@cdo/* and emits no HTML. Here
// everything is bundled and inlined instead.
//
//   yarn build:static   ->   dist-static/tutor-plus-deep-dive.html

const MEDIA_DIR = path.resolve(__dirname, 'public/media');

const dataUri = (file: string, mime: string) =>
  `data:${mime};base64,${fs.readFileSync(path.join(MEDIA_DIR, file)).toString('base64')}`;

/**
 * Inline the two mock media assets as data URIs.
 *
 * Both are loaded by the browser directly from an element `src` — the podcast
 * <audio> and the tutor <video> — so neither the MSW worker nor the static
 * fetch patch can serve them. Rewriting the URLs at build time is the only way
 * they survive into a single file. Each replacement asserts it matched, so a
 * rename in the source fails the build instead of shipping a dead player.
 */
function inlineMockMedia(): Plugin {
  const EDITS: {file: string; find: string; replace: () => string}[] = [
    {
      file: 'src/mocks/fixtures.ts',
      find: "'/media/mock-video.mp4'",
      replace: () => JSON.stringify(dataUri('mock-video.mp4', 'video/mp4')),
    },
    {
      file: 'src/lessonDeepDive/ReviewModalities/PodcastsBox.tsx',
      find: '`/ai_student_podcasts/retrieve_podcast_from_s3?${query}`',
      replace: () => JSON.stringify(dataUri('mock-podcast.mp3', 'audio/mpeg')),
    },
  ];

  return {
    name: 'inline-mock-media',
    enforce: 'pre',
    transform(code, id) {
      const edit = EDITS.find(e => id.endsWith(e.file));
      if (!edit) {
        return null;
      }
      if (!code.includes(edit.find)) {
        this.error(
          `inline-mock-media: expected ${edit.find} in ${edit.file}. ` +
            'The source moved; update vite.static.config.ts.',
        );
      }
      return {code: code.replace(edit.find, edit.replace()), map: null};
    },
  };
}

/**
 * Fold the emitted JS and CSS back into the HTML and drop the now-unreferenced
 * asset files, leaving one document. Runs on the bundle in memory so no
 * post-build script is needed.
 */
function singleFile(): Plugin {
  return {
    name: 'single-file',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlKey = Object.keys(bundle).find(k => k.endsWith('.html'));
      if (!htmlKey) {
        this.error('single-file: no HTML entry in the bundle');
      }
      const html = bundle[htmlKey!];
      if (html.type !== 'asset') {
        this.error('single-file: HTML entry is not an asset');
      }

      let source = String((html as {source: string | Uint8Array}).source);

      for (const [key, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && key.endsWith('.js')) {
          source = source.replace(
            new RegExp(
              `<script[^>]*src="[^"]*${escapeRe(key)}"[^>]*></script>`,
            ),
            () =>
              `<script type="module">\n${chunk.code.replace(/<\/script>/gi, '<\\/script>')}\n</script>`,
          );
          delete bundle[key];
        } else if (chunk.type === 'asset' && key.endsWith('.css')) {
          source = source.replace(
            new RegExp(`<link[^>]*href="[^"]*${escapeRe(key)}"[^>]*>`),
            () => `<style>\n${String(chunk.source)}\n</style>`,
          );
          delete bundle[key];
        }
      }

      // Nothing may still point at a sibling file.
      const dangling = source.match(/(?:src|href)="\.?\/?assets\/[^"]*"/g);
      if (dangling) {
        this.error(
          `single-file: unresolved external references remain: ${dangling.join(', ')}`,
        );
      }

      (html as {source: string}).source = source;
      // The entry is index.static.html; ship it under a self-describing name.
      (html as {fileName: string}).fileName = 'tutor-plus-deep-dive.html';
    },
  };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default defineConfig({
  plugins: [inlineMockMedia(), cdoResolverPlugin(), react(), singleFile()],
  resolve: {
    alias: {'@': path.resolve(__dirname, './src')},
  },
  // public/ holds the MSW worker and the raw mock media; the static build
  // inlines the media and does not use the worker, so copying it would just
  // leave dead files beside the one-file output.
  publicDir: false,
  build: {
    outDir: 'dist-static',
    emptyOutDir: true,
    // Everything must end up in the HTML, so never split and never spill a
    // small asset out to its own file.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: {polyfill: false},
    rollupOptions: {
      input: path.resolve(__dirname, 'index.static.html'),
      output: {inlineDynamicImports: true},
    },
  },
});
