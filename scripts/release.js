const { execSync } = require("child_process")
const fs = require("fs")

const version = process.argv[2]
if (!version || version.length < 3) {
  console.error("Specify version to release")
  process.exit(1)
}

console.log(`Publishing version ${version}...`)

function updatePackageJsonVersion(filePath) {
  const json = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }))

  json.version = version

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
}

function updatePackageDependencyVersion(filePath, dependencyName, version) {
  const json = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }))

  json.dependencies[dependencyName] = "^" + version

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
}

function replaceInFile(filePath, pattern, replacement) {
  fs.writeFileSync(
    filePath,
    fs
      .readFileSync(filePath, { encoding: "utf-8" })
      .replace(pattern, replacement)
  )
}

const run = (cwd, command) =>
  execSync(command, {
    cwd,
    stdio: "inherit",
  })

if (execSync("git status --short --porcelain").toString().length > 0) {
  console.error("Please commit all changes before running this command")
  process.exit(1)
}

updatePackageJsonVersion("cli/package.json")
run("cli", "pnpm install --lockfile-only")

updatePackageDependencyVersion(
  "cli/template/root/package.json",
  "docusaurus-plugin-luaudoc",
  version
)

updatePackageJsonVersion("docusaurus-plugin-luaudoc/package.json")
run("docusaurus-plugin-luaudoc", "pnpm install --lockfile-only")

replaceInFile(
  "extractor/Cargo.toml",
  /^(version = "\d+\.\d+\.\d+")$/m,
  `version = "${version}"`
)

run("docusaurus-plugin-luaudoc", "pnpm publish --no-git-checks")

run("cli/template/root", "pnpm install --lockfile-only")
run("extractor", "cargo clean")
run("extractor", "cargo check")

const tag = `v${version}`
run(process.cwd(), "git add .")
run(process.cwd(), `git commit -m "Release version ${version}"`)
run(process.cwd(), `git tag ${tag}`)

run("cli", "pnpm publish --no-git-checks")

run("extractor", "cargo publish")

run(process.cwd(), "git push")
run(process.cwd(), `git push origin ${tag}`)