## 0.1.11
* Changed out the shell tasks for process tasks. This allows for the removal of most the double quoting shenanigans that windows builds needed.
    * Hopefully this addresses [Issue #9](https://github.com/callwyat/mplab-extension/issues/9)
## 0.1.10
* Address vulnerability warnings in npm packages
## 0.1.8
* Added support for the J-Link programer
## 0.1.7
* Attempting to address the issues related to 4 series programming tools only rarely working
    * Turned off sending the tool configuration from the MPLABX project file by default
    * Tool configuration items can be allowed using the `programerToolAllowList` setting
    * See the following issues:
        * [Issue #1](https://github.com/callwyat/mplab-extension/issues/1)
        * [Issue #3](https://github.com/callwyat/mplab-extension/issues/3)
        * [Issue #6](https://github.com/callwyat/mplab-extension/issues/6)
## 0.1.6
* Addressed [Issue #5](https://github.com/callwyat/mplab-extension/issues/5) by adding a `mplabxFolderLocation` setting. Found in the VSCode settings menu.
* Added support to override the use of the latest version of MPLAB with a `mplabxVersion` setting
## 0.1.5
* Attempted to add support for the PKOB4 and ICE4 tools
## 0.1.4
* Second attempt at adding support for the IDC4Tool
## 0.1.3
* First attempt at adding support for the ICD4Tool
    * Thanks [Jason](https://github.com/jasonkelly214)!
## 0.1.2
* Credit goes to [David Alexander Bjerremose](https://github.com/DaBs) for this update!
    * Added support for `stopped on exception` and `paused on step` events
    * Added a `debug` setting to the debugger settings
    * Full implemented support to debug more then the default configuration
## 0.1.1
* Address Security Notifications
## 0.1.0
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
## 0.0.6
* Removed the requirement for ".X" to be in the path for the build commands
* Added problem matches for MPASM builds
## 0.0.5
* More work on Windows support
* Added the `xc` problem matcher to make build errors easier to find
* Added the `MPLABX: Update private make files` command
* Added the `MPLABX: Clean Project` command
* Added a clean option to the build task type e.g. `"task": "clean"`
## 0.0.4
* Tested on Windows! Resolved issues with "make" path being wrong, and MPLABX v6.00 graduating out of "Program Files (x86)
## 0.0.3
* Resolved an issue with the "MPLABX: Build Project" command not working when there was only one project
## 0.0.2
* Added a command to list the attached programers
## 0.0.1
* First publication! Building works, next up working on Programing.

