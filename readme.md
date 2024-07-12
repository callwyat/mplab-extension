# VSLABX (MPLABX Extension)

An extension that enables building and debugging MPLABX projects from within Visual Studio Code

## VSLABX Prerequisites

* MPLABX v5.40 or greater installed on machine
    * Older installations may work but are not validated

## Build

Building can be started by either using the command `MPLABX: Build Project` from the command pallet or creating a build task in `.vscode/tasks.json`. For a build to be successful, several auto-generated files are needed. These files can be generated by opening the project in MPLABX, or by running the `MPLABX: Update private make files` command.

### MPLABX: Build Project
When called from the command pallet, this command will do the following:
* Scans the current workspace for MPLABX project folders by looking for a `Makefile` contained in a folder that end's with `.X`
    * If more then one MPLABX project folder is found, the user will be prompted to select one of the project folders found
* Invokes MPLABX's make with the directory of the selected project

### Build Task
To create a build task:
* Create the `.vscode/task.json` file
    * Issue the `Tasks: Run Build Task` command from the command pallet, or by using the build keybinding "ctrl+b"
    * A "No build task configured..." message should appear. Press enter to select a task template.
    * Select "create task.json from task template"
    * Select "Others"
* Added the `mplabx` build configuration
    * Clear out the contents `tasks` object (from square bracket open to close)
    * Start typing `mplabx-build` and press enter to insert the following snippet
   ```JSON
    {
        "label": "MPLABX Build",
        "type": "mplabx",
        "task": "build",
        "projectFolder": "${workspaceFolder}/{Path to MPLABX Project}",
        "configuration": "default",
        "problemMatcher": [
            {
                "base": "$xc",
                "fileLocation": [
                    "relative",
                    "${workspaceFolder}/{Path to MPLABX Project}"
                ],
            }
        ],
        "group": {
            "kind": "build",
            "isDefault": true
        }
    }
    ```
    * If the MPLABX project is not the same as the `workspaceFolder` append the rest of the path to the `projectFolder` item e.g. `"${workspaceFolder}\TestProject.X"`
    * If building an MPASM project, replace the problem matcher with the following:
    ```JSON
    "problemMatcher": [
                "$mpasm",
                "$mpasm-msg"
            ],
    ```
* Save the file
* Run the `Tasks: Run Build Task` command again
    * Press enter to select a build task
* Select "MPLABX Build"
* Now running the build command will build the selected project

## Program
This extension supports a few methods for programming that fall into two major catagories, the [Microchip Debugger (MDB)](#microchip-debugger-mdb-programming) and the [Integrated Programming Environment](#integrated-programming-environment-ipe).

### Microchip Debugger (MDB) Programming
The Microchip Debugger comes built-in with MPLABX, which makes it the most ideal choice as it doesn't require any extra software be installed in order to work. 

However, it does have a few oddities, such as not taking arguments directly, opting instead to take them in view a "script file", and not releasing the reset line to the target device after programming when ran on macOS. The macOS issue is something that Microchip will need to address. To address the need for a script instead of command line arguments, the extension will automatically take all `args` and save them to a temporary file first, then the path of the script is passed to the mdb execution. If you would like to use the `mdb` command directly, you can override the behavior with the `Mdb Command Args Redirect To Script` setting.

Here are a few examples of how to use the `mdb` command from a task:
```JSON
{
    // This configuration will attempt to generate the standard arguments for the user from the project file
    "label": "MPLABX Program",
    "type": "mplabx",
    "task": "program",
    "projectFolder": "${workspaceFolder}/${1:Path to MPLABX Project}",
    "command": "mdb",
    "args": [],
    "problemMatcher": [],
    "dependsOn": "MPLABX Build"
},
{
    // This configuration allows the user to specify exactly what they want while the extension only finds the path to the mdb executable
    "label": "MPLABX Command",
    "type": "vslabx",
    "command": "mdb",
    "args": [
        "device PIC18F46J53",
        "hwtool PICKit4 -p",	// The '-p' flag puts the tool in Programer mode.
        "program ${workspaceFolder}/dist/default/production/{hex file name}"
    ]
}
```

### Integrated Programming Environment (IPE)
The MPLABX Integrated Programming Environment (IPE) is an optional program that can be installed while installing the MPLABX Integrated Development Environment (IDE). This method provides a standard command line interface though, and works reliably on all operating systems that support MPLABX. However, it is an optional program, so care needs to be taken when installing MPLABX IDE to make sure MPLABX IPE is also installed.

Here are a few examples of how to use the `ipe` command from a task:
```JSON
    // This configuration will attempt to generate the standard arguments for the user from the project file
    {
        "label": "MPLABX Program",
        "type": "mplabx",
        "task": "program",
        "projectFolder": "${workspaceFolder}/${1:Path to MPLABX Project}",
        "command": "ipe",
        "args": [
            "CONF=\"default\"",
            "-M",	// Program all regions
            "-I",	// Display Device ID
            "-OL"	// Release from Reset
        ],
        "problemMatcher": [],
        "dependsOn": "MPLABX Build"
    },
    // This configuration allows the user to specify exactly what they want while the extension only finds the path to the ipe executable
    {
        "label": "MPLABX Command",
        "type": "vslabx",
        "command": "ipe",
        "args": [
            "-P18F46J53",	// -P plus the name of the target device minus "PIC"
            "-TPPK4",       // -TP plus the name of the tool to use
            "-F${workspaceFolder}/dist/default/production/{hex file name}",
            "-M",	// Program all regions
            "-I",	// Display Device ID
            "-OL"	// Release from Reset
        ]
    }
```

## Debug
This extension supports two methods of launching a debug session: [MPLABX](#mplabx) and [MDB](#mdb).

#### MPLABX
This method is designed to be the easiest to use. All programer settings are pulled from the project file in `nbproject/configuration.xml`. This includes what tool to use and any voltage settings. If programer settings need to be changed, it is recommended to change them from withing MPLABX to prevent corrupting the project.

> An issue was found with 4 series programers (e.g. PICKit4 and ICD4) that cause the programers to not work with the extension if settings were being sent. If settings are needed they can be selectively turned on using the `Programer Tool Allow List` setting

#### Example MPLABX Configuration
```JSON
{
    "type": "mplabx",
    "request": "launch",
    "name": "MPLABX Debug",
    "program": "${workspaceFolder}/",
    "stopOnEntry": true,
    "preLaunchTask": "MPLABX Build",
    "debug": false,
    "configuration": "default"
}
```

#### MPLABX Debugger Notes
The names of programers do not match between the configuration file and the mdb tool. As such, the names of the tools need to matched up manually. If you would like to use a tool that is not listed below, please [submit an issue on GitHub](https://github.com/callwyat/mplab-extension/issues) with the name of the tool listed in `nbproject\configuration` e.g. (`<platformTool>pk4hybrid</platformTool>`), or use the MDB debugging method

A list of all supported tools can be found in [supportedTools.json](./src/debugAdapter/supportedToolsMap.json)

### MDB
This method allows the users more direct access the Microchip Debugger (MDB) which is what the [MPLABX](#mplabx) uses. The MDB method requires the following to work:
* The path to the `.elf` file generated by the build
    * This is typically found in the `./dist/{configurationName}/{debug|production}/` folder
* The model of the chip to debug
    * e.g. PIC18F46J53
* The type of debugging tool to use
    * A list of all supported tool types can be found using the `MDB: List Supported Tool Types` command from the command pallet
    * e.g. pk4hybrid

If you would like to modify tool options, such as providing power from the tool, they can be added to the `toolOptions` input. The best place to find the available option names is in a `configuration.xml` file that uses the given tool.

#### Example MDB Configuration
```JSON
{
    "type": "mdb",
    "request": "launch",
    "name": "Microchip Debug Adapter",
    "filePath": "${workspaceFolder}/TestProject.X/dist/default/production/TestProject.X.production.elf",
    "device": "PIC18F46J50",
    "toolType": "pk4hybrid",
    "toolOptions": { },
    "stopOnEntry": true,
    "preLaunchTask": "MPLABX Build"
}
```

### General Debugger Notes
#### First Time Setup
If a launch.json file has not been created, one can be created by going to the debug tab in the side bar and clicking `create a launch.json file`, and selecting `MPLABX: Debug`.

#### Running Debugger
Use F5 or the run button on the debugger tab. The `preLaunchTask` item in the configuration will call the build task before connecting to the hwtool, programing, and starting. These tasks can take a while to execute.

#### Simulator Support
Basic simulator support is available, but support for stimulus files is missing currently. If you would like support for them, please [submit an issue on GitHub](https://github.com/callwyat/mplab-extension/issues)
