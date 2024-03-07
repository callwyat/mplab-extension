# Changelog
### 0.1.28
* Addressed [Issue #22](https://github.com/callwyat/mplab-extension/issues/22).
    * Launching a debug session without a `launch.json` fails.

### 0.1.26
* Full Release version of 0.1.25

### 0.1.25 (Pre-Release)
* Attempted to add support for the `PKOBSKDEPlatformTool` tool (see [Issue #21](https://github.com/callwyat/mplab-extension/issues/21))
* None user facing:
    * Implemented automated testing of the extension
    * Updated node packages
    * Removed the word "Extension" from the start of every command key

### 0.1.24
* Full Release version of 0.1.23

### 0.1.23 (Pre-Release)
* `mplabx` task definition changes
    * Added `args` property.
        * These arguments are inserted directly after the make command and before the final command of build or clean. Addresses [Issue #11](https://github.com/callwyat/mplab-extension/issues/11).
    * Marked the `configuration` property as deprecated.
        * Deprecated - Replaced by adding `CONF=\"{configurationName}\"` to the `args` list.
    * Marked the `debug` property as deprecated.
        * Deprecated - Replaced by adding `TYPE_IMAGE=DEBUG_RUN` to the `args` list.

### 0.1.22
* The full release of 0.1.21
* Thanks to [hdhlhs](https://github.com/hdhlhs) for figuring out the timeouts were the cause of [Issue #19](https://github.com/callwyat/mplab-extension/issues/19).

### 0.1.21 (Pre-Release)
* Fixed issue were the debug console would show the written and read statements on the same line.
* Addressed [Issue #19](https://github.com/callwyat/mplab-extension/issues/19) (Timeout is preventing programming from completing) by replacing timeouts with cancellation events.

### 0.1.20
* Bugfix: Breakpoints could fail to work until after a breakpoint was added or removed during runtime.

### 0.1.18
* Updated the [README](./readme.md)
* Added official support for the MPLAB Snap Debugger/Programer [Issue #17](https://github.com/callwyat/mplab-extension/issues/17)

### 0.1.16
* The full release of 0.1.15

### 0.1.15 (Pre-Release)
* Fixed issue with Pre-Release 0.1.13 MPLABX: Debug not working for some projects
* Added the following commands:
    * MDB: List Supported Tools
    * MDB: List Attached Tools
* Skipping pre-release features from version 0.1.13
* Fixed issue with the ICD3 mapping being wrong [Issue #13](https://github.com/callwyat/mplab-extension/issues/13)
* Added debugger mapping for ICD2 (hopefully)

### 0.1.14
* Skipping a release version, 0.1.13 introduced a breaking bug for the MPLABX: Launch Debug

### 0.1.13 (Pre-Release)
* Finally figured out why non-default configurations would fail to debug! [Issue #4](https://github.com/callwyat/mplab-extension/issues/4)
* Added a second debug configuration 'mdb' that allows users to directly use a `.elf` file with the debug adapter [Issue #12](https://github.com/callwyat/mplab-extension/issues/12)

#### 0.1.12
* Added support for the PicKit5 (Hopefully) [Issue #10](https://github.com/callwyat/mplab-extension/issues/10)
#### 0.1.11 (Pre-Release)
* Changed out the shell tasks for process tasks. This allows for the removal of most the double quoting shenanigans that windows builds needed.
    * Hopefully this addresses [Issue #9](https://github.com/callwyat/mplab-extension/issues/9)
#### 0.1.10
* Address vulnerability warnings in npm packages
#### 0.1.8
* Added support for the J-Link programer
#### 0.1.7
* Attempting to address the issues related to 4 series programming tools only rarely working
    * Turned off sending the tool configuration from the MPLABX project file by default
    * Tool configuration items can be allowed using the `programerToolAllowList` setting
    * See the following issues:
        * [Issue #1](https://github.com/callwyat/mplab-extension/issues/1)
        * [Issue #3](https://github.com/callwyat/mplab-extension/issues/3)
        * [Issue #6](https://github.com/callwyat/mplab-extension/issues/6)
#### 0.1.6
* Addressed [Issue #5](https://github.com/callwyat/mplab-extension/issues/5) by adding a `mplabxFolderLocation` setting. Found in the VSCode settings menu.
* Added support to override the use of the latest version of MPLAB with a `mplabxVersion` setting
#### 0.1.5
* Attempted to add support for the PKOB4 and ICE4 tools
#### 0.1.4
* Second attempt at adding support for the IDC4Tool
#### 0.1.3
* First attempt at adding support for the ICD4Tool
    * Thanks [Jason](https://github.com/jasonkelly214)!
#### 0.1.2
* Credit goes to [David Alexander Bjerremose](https://github.com/DaBs) for this update!
    * Added support for `stopped on exception` and `paused on step` events
    * Added a `debug` setting to the debugger settings
    * Full implemented support to debug more then the default configuration
#### 0.1.1
* Address Security Notifications
#### 0.1.0
* First release with debugger support!
    * Breakpoints support
    * Primitive variables can be read
        * Automatically for Local variables and Parameter variables
        * By adding an evaluation statement
        * Hovering over the name of the variable
    * Tool Support
        * PICKit3
        * PICKit4
        * Simulator
#### 0.0.6
* Removed the requirement for ".X" to be in the path for the build commands
* Added problem matches for MPASM builds
#### 0.0.5
* More work on Windows support
* Added the `xc` problem matcher to make build errors easier to find
* Added the `MPLABX: Update private make files` command
* Added the `MPLABX: Clean Project` command
* Added a clean option to the build task type e.g. `"task": "clean"`
#### 0.0.4
* Tested on Windows! Resolved issues with "make" path being wrong, and MPLABX v6.00 graduating out of "Program Files (x86)
#### 0.0.3
* Resolved an issue with the "MPLABX: Build Project" command not working when there was only one project
#### 0.0.2
* Added a command to list the attached programers
#### 0.0.1
* First publication! Building works, next up working on Programing.

