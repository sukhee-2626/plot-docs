// Portable build for machines where Smart App Control blocks the NSIS
// uninstaller step. Mirrors electron-builder.cjs but swaps the NSIS setup
// target for a single self-contained Plot Docs executable.
const base = require('./electron-builder.cjs')

module.exports = {
  ...base,
  win: {
    ...base.win,
    artifactName: 'Plot-Docs-${version}.${ext}',
    target: [
      {
        target: 'portable',
        arch: [base.win.target[0].arch[0]],
      },
    ],
  },
}
