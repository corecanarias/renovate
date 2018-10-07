const { execSync } = require('child_process');
const fs = require('fs');

function extractDependencies(content, fileName, config) {
  logger.debug('gradle.extractDependencies()');
  const deps = [{name: "dummy"}];
  const gradleFile = `${config.localDir}/${fileName}`;

  fs.writeFileSync(gradleFile, content);
  execSync("gradle dependencyUpdates -Drevision=release", {stdio: "inherit", cwd: config.localDir});

  return { deps }
}

function getPackageUpdates(config) {
  logger.debug('gradle.getPackageUpdates()');

  const contents = fs.readFileSync(`${config.localDir}/build/dependencyUpdates/report.json`).toString();
  const dependencies = JSON.parse(contents);

  return [dependencies.outdated.dependencies];
}

function updateDependency(fileContent, upgrade) {
  logger.debug('gradle.updateDependency()');
  const gradleFile = `${upgrade.localDir}/build.gradle`;

  execSync("gradle useLatestVersions", {stdio: "inherit", cwd: upgrade.localDir});
  const contents = fs.readFileSync(gradleFile).toString();
  return contents;
}

module.exports = {
  extractDependencies,
  getPackageUpdates,
  updateDependency,
  language: 'gradle',
};
