# PlateEditor

PlateEditor is a free web application to work with multi-well plates, from creation of layouts to data visualization and aggregation.
It is primarily designed as a tool to help scientists working in the field of biology to simplify and fasten the process of data aggregation.
PlateEditor is fully client-side: no data are ever transferred to the server, ensuring complete security and privacy of your research data. It is powered by streaming-enabled parsing utilities:
1. for text and csv file, thanks to the [PapaParse](https://www.papaparse.com/) library,
2. for excel files (.xlsx, .xls), powered by [JSZip](https://stuk.github.io/jszip/) and internal parsing libraries (these are expected to work fine in most situations, but are still currently under active validation)


## Installation

For users, there is no installation required.
- If you have Internet access, simply connect to [PlateEditor.com](https://plateeditor.sourceforge.io) and enjoy the latest version of the application.
- If you plan to work offline, download the latest available build here: [Latest build](https://sourceforge.net/projects/plateeditor/), unzip the files in your computer and open 'Editor.html' with your web browser.
Be sure to retrieve the latest build regularly to ensure you can use all the new functionalities!

For developers, there are dependencies required for the compilation of the source code using Gulp. They are all listed in the _package.lock_ file and can be installed using the _npm_ _install_ command. Here is the step-by-step guide:
- Make sure [nodeJS](https://nodejs.org) is installed on your computer.
- Download the source code from GitHub to your computer (or clone the repository using your Git)
- To install all the required dependencies, open a terminal, navigate to the source folder and run:

```
npm install
```

- To create the minimized and collated js and css files required for the application, run the following command in your ternminal:

```
npm run compil
```

This will create the dist/ directory with the required files and sourcemaps in it. Open the application (Editor.html) to test and validate your changes.
The following command can also be used to generate a .zip file containing all the components needed in the bundled version of the application:

```
npm run release
```

Of course, the gulpfile.js file can be updated to modify these commands or create new ones, as desired. In this case, don't forget to edit the package.json file to register the new scripts.

## Overview

A regular workflow with PlateEditor can be divided in 3 steps as follows:
1. Define or load a layout for your plate
2. Attach the result files
3. Visualize, analyze and export the aggregated data


**Preparing a layout**

PlateEditor has been designed to let you create even complicated plate layouts in minutes. It uses so-called _Areas_ that can be tagged in the wells of your plate and will be used for data aggregation.
Wells can also be tagged with concentrations data. You don't need to define new areas for each concentration: PlateEditor will do the pairing by itself. This allow you to quickly prepare dose-responses, for example.
If you have many areas to define (like multiple cell-lines or compounds or both), use _Ranges_. These are special Areas with self-incrementing abilities. You can use them with their generic names (#1, #2, #3...) or attach so-called _Definitions_ to quickly define their names from a list.
Multiple areas will overlap in the same well? Don't panic, that's where _Layers_ become useful: they let you define multiple areas overlapping in the same well, instead of creating all the areas for all the combinations. Again, PlateEditor will do this for you!

**Attaching data**

PlateEditor let you import and visualize heatmaps of data file from your plate readers.
The files are not sent to the server, or loaded into the memory: they are read only when necessary to extract and display the required information. This is made possible through streaming, a process in which the file is read row-by-row.
Thanks to this, working with large files is not a problem and will not crash your browser. Streaming of over 10 MB files is achieved in a couple seconds. It will take longer for very big files however, so be sure to split it into smaller fragments to accelerate the retrieval of data.

**Visualize, analyze, aggregate, export**

PlateEditor includes two powerful data aggregation features: _Columns_ or _Grouped_. These let you pool all the well values for each individual area/concentration combinations and visualize them as single (column) or double (grouped) entry arrays.
For grouped analysis, you will be able to select the data you want to see as row/column entries. You can have a look at the individual values, or the average / SD. Copy-paste or export the resulting tables as text data for downstream use in your spreadsheet/graph software.

For a more complete and detailed presentation of all PlateEditor's functionalities, check-out the on-line [wiki](https://sourceforge.net/p/plateeditor/wiki/Home/).

## Contributing
Please let us know if you encounter bugs or encounter display issues in your browser.


## License
[MIT](https://choosealicense.com/licenses/mit/)