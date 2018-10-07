const { execSync } = require('child_process');
const fs = require('fs');

const gradle = require('./build-gradle');

function extractDependencies(content, fileName, config) {
  logger.debug('gradle.extractDependencies()');
  const deps = [{ name: 'dummy' }];
  const gradleFile = `${config.localDir}/${fileName}`;

  fs.writeFileSync(gradleFile, content);
  execSync('gradle dependencyUpdates -Drevision=release', {
    stdio: 'inherit',
    cwd: config.localDir,
  });

  return { deps };
}

function getPackageUpdates(config) {
  logger.debug('gradle.getPackageUpdates()');

  const contents = fs.readFileSync(`${config.localDir}/build/dependencyUpdates/report.json`).toString();
  const dependencies = JSON.parse(contents);

  dependencies.outdated.dependencies.forEach(dep => {
    dep.depGroup = dep.group;
    return dep;
  });

  return dependencies.outdated.dependencies;
}

function updateDependency(fileContent, upgrade) {
  logger.debug(`gradle.updateDependency(): group:${upgrade.depGroup}, name:${upgrade.name}, version:${upgrade.version} ==> ${upgrade.available.release}`);

  const newFileContent = gradle.updateGradleVersion(fileContent, buildGradleDependency(upgrade), upgrade.available.release);
  return newFileContent;
}

function buildGradleDependency(config) {
  return {group: config.depGroup, name: config.name, version: config.version}
}

module.exports = {
  extractDependencies,
  getPackageUpdates,
  updateDependency,
  language: 'gradle',
};
