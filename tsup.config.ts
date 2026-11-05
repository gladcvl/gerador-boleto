import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    pdf: 'src/pdf/index.ts',
    cnab: 'src/cnab/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  // pdfkit é peer dependency opcional: nunca embutir no bundle
  external: ['pdfkit'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});
