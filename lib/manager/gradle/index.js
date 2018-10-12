const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const gradle = require('./build-gradle');

const GRADLE_DEPENDENCY_REPORT_COMMAND =
  'gradle --init-script init.gradle dependencyUpdates -Drevision=release';
const GRADLE_DEPENDENCY_REPORT_FILENAME = 'build/dependencyUpdates/report.json';

function extractDependencies(content, fileName, config) {
  logger.debug('gradle.extractDependencies()');
  const deps = [{ name: 'dummy' }];
  const gradleFile = path.join(config.localDir, fileName);

  fs.writeFileSync(gradleFile, content);
  configureUseLatestVersionPlugin(config.localDir);
  execSync(GRADLE_DEPENDENCY_REPORT_COMMAND, {
    stdio: 'inherit',
    cwd: config.localDir,
  });

  return { deps };
}

function getPackageUpdates(config) {
  logger.debug('gradle.getPackageUpdates()');

  const contents = fs
    .readFileSync(path.join(config.localDir, GRADLE_DEPENDENCY_REPORT_FILENAME))
    .toString();
  const dependencies = JSON.parse(contents);

  dependencies.outdated.dependencies.forEach(dep => {
    // eslint-disable-next-line no-param-reassign
    dep.depGroup = dep.group;
  });

  return dependencies.outdated.dependencies;
}

function updateDependency(fileContent, upgrade) {
  // prettier-ignore
  logger.debug(`gradle.updateDependency(): group:${upgrade.depGroup}, name:${upgrade.name}, version:${upgrade.version} ==> ${upgrade.available.release}`);

  const newFileContent = gradle.updateGradleVersion(
    fileContent,
    buildGradleDependency(upgrade),
    upgrade.available.release
  );
  return newFileContent;
}

function configureUseLatestVersionPlugin(localDir) {
  const content = `
gradle.projectsLoaded {
    rootProject.allprojects {
        buildscript {
            repositories {
                maven {
                 url "https://plugins.gradle.org/m2/"
                }
            }
           dependencies {
            classpath "gradle.plugin.se.patrikerdes:gradle-use-latest-versions-plugin:0.2.3"
            classpath 'com.github.ben-manes:gradle-versions-plugin:0.17.0'
          }
        }
        afterEvaluate { project ->
          project.apply plugin: 'com.github.ben-manes.versions'
          project.apply plugin: 'se.patrikerdes.use-latest-versions'
        }
    }
}  
  `;
  const gradleInitFile = path.join(localDir, 'init.gradle');
  fs.writeFileSync(gradleInitFile, content);
}

function buildGradleDependency(config) {
  return { group: config.depGroup, name: config.name, version: config.version };
}

module.exports = {
  extractDependencies,
  getPackageUpdates,
  updateDependency,
  language: 'java',
};
