# Additional files available for the validation of PlateEditor

**Legacy Excel (xls) files**
1. Big.xls
- File Type: Excel (xls) result file manually created with random data using a modern version of Excel
- Contents: 4 sheets, including one sheet with the maximum allowed number of rows (65,536)
- Test items: parsing of big files without browser crashing using the XLS parser. Performance evaluation for parsing of big files
- Expected output: the file should be parsed correctly within 2 to 4 seconds

2. Error.xls
- File Type: a regular text file manually created with a .xls extension
- Contents: random data
- Test items: correct feedback in case of parsing failure using the XLS parser
- Expected output: error message in the parsing preview box ("Error: Unknown CPF version"). Correct parsing when switching to the TXT/CSV parser

3. Formula.xls
- File Type: Excel (xls) file containing formulas, created using a modern version of Excel
- Contents: a single sheet containing various formula calculation and outputs
- Test items: parsing of formula output using the XLS parser
- Expected output: correct parsing of all formula outputs

4. Old.xls
- File Type: Excel (xls) result file created by an outdated plate reader in a lower version of excel (~ year 1995)
- Contents: 4 sheets of data, protocol details and notes
- Test items: parsing of old excel files using the XLS parser.
- Expected output: the file should be parsed correctly

**Modern Excel (xlsx) files**
1. Big.xlsx
- File Type: Modern excel (xlsx) result file manually created with random data
- Contents: 4 sheets, including one sheet with 253,953 rows.
- Test items: parsing of big files without browser crashing using the XLSX parser. Performance evaluation for parsing of big files
- Expected output: the file should be parsed correctly within 5 to 10 seconds

2. Error.xlsx
- File Type: a regular text file manually created with a .xlsx extension
- Contents: random data
- Test items: correct feedback in case of parsing failure using the XLSX parser
- Expected output: error message in the parsing preview box ("Error: Can't find end of central directory : is this a zip file ? If it is, see http://stuk.github.io/jszip/documentation/howto/read_zip.html "). Correct parsing when switching to the TXT/CSV parser

3. Formula.xlsx
- File Type: Modern excel (xlsx) file containing formulas
- Contents: a single sheet containing various formula calculation and outputs
- Test items: parsing of formula output using the XLSX parser
- Expected output: correct parsing of all formula outputs

**Tab-separated (txt) files**
1. Big.txt
- File Type: Tab-separated text result file manually created with random data
- Contents: 376,522 rows of random data
- Test items: parsing of big files without browser crashing using the TXT/CSV parser. Performance evaluation for parsing of big files
- Expected output: the file should be parsed correctly within 3 to 5 seconds

2. Definition.txt
- File Type: Tab-separated text definition and result file manually created with data designed to validate the plate definition parsing and representation
- Contents: data for 3 plates of 24-wells, with Well ID and Plate ID columns. Definition should use the Test column, result can use both Test and Value. To use this file, use the _Range_Layout.save_ layout file provided and pair the definition and result plates automatically by name (or manually, P1 to P1, P2 to P2 and P3 to P3)
- Test items: Well/Plate mapper, Pairing, Min & Max values for heatmap
- Expected output: correct positioning of range definition in each well and each plate. Popup information should match the Test field. Min & Max source set on Plate should display a smooth gradient for each plate

3. Heatmap.txt
- File Type: Tab-separated text result file manually created with data designed to validate the heatmap representation
- Contents: 96 rows of data and a header. Columns include a tracker for well location and simple/crash values for validation of the heatmap representation
- Test items: correct positioning of values in the plate and correct representation of values using the 3-color heatmaps
- Expected output: Each well should display its own 0-based index with a smooth gradient (Index). Colors should match with the values in the well, with empty of crash values correctly crossed (Rows F and G) (Values). Text should be correctly displayed and well Name should be at the correct location (Text)

**Layout files**
1. Range_Layout.save
- File Type: PlateEditor Layout file
- Contents: JSON for a 24-well plate with a single range (1 replicate) tagged in every well
- Test items: Load preview, Load, Project Reset
- Expected output: The layout should load correctly, reseting previous layout if present

2. Layout_Error.save
- File Type: Incorrect PlateEditor Layout file
- Contents: truncated JSON for a 96-well plate layout
- Test items: layout loading error
- Expected output: Layout loading error should display in the console: "Unable to load the layout. SyntaxError: Unexpected token u in JSON at position 49"