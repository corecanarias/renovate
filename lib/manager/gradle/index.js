const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');

const gradle = require('./build-gradle');

const GRADLE_DEPENDENCY_REPORT_COMMAND =
  'gradle --init-script init.gradle dependencyUpdates -Drevision=release';
const GRADLE_DEPENDENCY_REPORT_FILENAME = 'build/dependencyUpdates/report.json';

async function extractDependencies(content, fileName, config) {
  logger.debug('gradle.extractDependencies()');
  const gradleFile = path.join(config.localDir, fileName);

  await fs.writeFile(gradleFile, content);
  await configureUseLatestVersionPlugin(config.localDir);
  const gradleSuccess = await executeGradle(config);

  if (gradleSuccess) {
    const deps = await extractDependenciesFromUpdatesReport(config.localDir);
    if (deps.length === 0) {
      return null;
    }
    return { deps };
  }
  return null;
}

async function getPackageUpdates(config) {
  logger.debug('gradle.getPackageUpdates()');

  const contents = await fs.readFile(
    path.join(config.localDir, GRADLE_DEPENDENCY_REPORT_FILENAME),
    'utf8'
  );
  const dependencies = JSON.parse(contents);

  return dependencies.outdated.dependencies.map(dep => {
    const update = { ...dep };
    update.depGroup = dep.group;
    update.depName = `${dep.group}:${dep.name}`;
    update.newValue = dep.available.release;
    return update;
  });
}

function updateDependency(fileContent, upgrade) {
  // prettier-ignore
  logger.debug(`gradle.updateDependency(): depName:${upgrade.depName}, version:${upgrade.version} ==> ${upgrade.newValue}`);

  const newFileContent = gradle.updateGradleVersion(
    fileContent,
    buildGradleDependency(upgrade),
    upgrade.available.release
  );
  return newFileContent;
}

async function configureUseLatestVersionPlugin(localDir) {
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
  await fs.writeFile(gradleInitFile, content);
}

function buildGradleDependency(config) {
  return { group: config.depGroup, name: config.name, version: config.version };
}

async function extractDependenciesFromUpdatesReport(localDir) {
  const contents = await fs.readFile(
    path.join(localDir, GRADLE_DEPENDENCY_REPORT_FILENAME),
    'utf8'
  );
  const dependencies = JSON.parse(contents);
  const combinedGradleDeps = dependencies.current.dependencies.concat(
    dependencies.exceeded.dependencies,
    dependencies.outdated.dependencies,
    dependencies.unresolved.dependencies
  );
  const res = combinedGradleDeps.map(dependency => ({
    depName: `${dependency.group}:${dependency.name}`,
    currentValue: dependency.version,
  }));
  return res;
}

async function executeGradle(config) {
  let stdout;
  let stderr;
  try {
    ({ stdout, stderr } = await exec(GRADLE_DEPENDENCY_REPORT_COMMAND, {
      cwd: config.localDir,
      shell: true,
    }));
  } catch (err) {
    logger.error(
      { err },
      `Gradle command ${GRADLE_DEPENDENCY_REPORT_COMMAND} failed.`
    );
    return false;
  }
  logger.info({ stdout, stderr }, 'Gradle report complete');
  return true;
}

module.exports = {
  extractDependencies,
  getPackageUpdates,
  updateDependency,
  language: 'java',
};
