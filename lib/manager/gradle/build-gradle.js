/**
 * Functions adapted/ported from https://github.com/patrikerdes/gradle-use-latest-versions-plugin
 * gradle-use-latest-versions-plugin is licensed under MIT and Copyright (c) 2018 Patrik Erdes
 */

function moduleVersionStringFormatMatch(dependency) {
  return new RegExp(
    '(["\']' + dependency.group + ':' + dependency.name + ':)[^$].*?(["\'])'
  );
}

function moduleVersionMapFormatMatch(dependency) {
  // prettier-ignore
  return new RegExp(
    '(group\\s*:\\s*["\']' + dependency.group + '["\']\\s*,\\s*' +
    'name\\s*:\\s*["\']' + dependency.name + '["\']\\s*,\\s*' +
    'version\\s*:\\s*["\']).*?(["\'])'
  );
}

function updateGradleVersion(buildGradleContent, dependency, newVersion) {
  if (dependency) {
    const moduleVersionMatch = moduleVersionStringFormatMatch(dependency);
    if (buildGradleContent.match(moduleVersionMatch)) {
      return buildGradleContent.replace(
        moduleVersionMatch,
        `$1${newVersion}$2`
      );
    }

    const mapVersionMatch = moduleVersionMapFormatMatch(dependency);
    if (buildGradleContent.match(mapVersionMatch)) {
      return buildGradleContent.replace(mapVersionMatch, `$1${newVersion}$2`);
    }
  }

  return buildGradleContent;
}

module.exports = {
  updateGradleVersion,
};
