/** Tasks run by lint-staged on git-staged files (via the husky pre-commit hook). */
export default {
  "*.ts": ["oxlint --fix", "prettier --write"],
  "*.{js,cjs,mjs,json,md,yml,yaml}": ["prettier --write"],
};
