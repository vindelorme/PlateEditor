//***************************************************************************************
// HELPER object - Root object for handling of functions to help reformat/re-arrange data
//***************************************************************************************
class Helper {
	constructor() {}
	//Static Methods
	static init() { //Initialize the object and controls
		this.Anchors = { //Anchors for the root elements of the Plotter
			Input: "Input", //ID of the html element hosting the input options
			Actions: "Actions", //ID of the html element hosting the action buttons
			Output: "Output", //ID of the html element hosting the output tab
		}
		this.MultipleInput = LinkCtrl.new("Checkbox", {ID: this.Anchors.Input, Preserve: true, Default: false, Label: "Multi-select", Change: function(e) {
			let table = this.Inputs;
			let selected = table.SelectedIndices;
			table.Multiple = e;
			if(e === false && selected.length > 0) { //If only one input is possible, remove excess of inputs by keeping only the first one, in case more than one is selected
				table.setValue([selected.shift()]); //Keep only the first selected input
			}
		}.bind(this), Title: "Tick to enable multiple input selection"});
		this.MultipleInput.init();
		this.Inputs = new RespTable({ID: this.Anchors.Input, Fields: ["Source", "Name", "Size", "Other"], Preserve: true, RowNumbers: true, Multiple: false, OnSelect: function() {}.bind(this)});
		this.Inputs.init();
		this.OutputTab = new TabControl({ //The main tab used for data output
			ID: this.Anchors.Output,
			AfterDelete: function(i) {}.bind(this),
		});
		let buttons = [
			{Label: "Add Input", Icon: {Type: "Load"}, Click: function() {
				Form_Import.open({OnClose: function(data) {
					this.Inputs.Array = this.Inputs.Array.concat(data);
					this.Inputs.update();
				}.bind(this)});
			}.bind(this)},
			{Label: "Intertwin", Click: function() {this.intertwin()}.bind(this), Title: "Intertwin 2 datasets by alternating 1 column from the mother dataset and 1 column from the child"},
			{Label: "Flatten", Click: function() {this.flatten()}.bind(this), Title: "Flatten a set of data by appending all elements into a single column (Headers are ignored)"},
			{Label: "Transpose", Click: function() {this.transpose()}.bind(this), Title: "Same as flatten, but the data are first transposed before being appended (Headers are still ignored)"},
			{Label: "Match", Click: function() {this.match()}.bind(this), Title: "Match elements from the Child list within the Mother list (Only the first column of each dataset will be used)"},
			{Label: "Reorder (96w)", Click: function() {this.order()}.bind(this), Title: "Reorder the data by ascending well order (\"A1, A2, A3\" basis), for a 96w plate. Well column must be first"},
			//{Label: "Columbus Stitching config", Click: function() {this.stitch()}.bind(this), Title: "Read the Columbus ImageIndex file and extract the tile configuration information"},
		];
		//GetId(this.Anchors.Actions).append(LinkCtrl.buttonBar(buttons)); //initialize the buttons
		this.Buttons = LinkCtrl.new("ButtonBar", {ID: this.Anchors.Actions, Buttons: buttons, Spacing: true});
		this.Buttons.init();
	}
	static textArea(value, id) { //Output the html for a text area with the value passed
		let add = "";
		if(id) {add = "id=\"" + id + "\""}
		return "<textarea " + add + " style=\"width: 500px; height: 250px; white-space: pre;\">" + value + "</textarea>";
	}
	static intertwin() { //Intertwin 2 datasets by alternating 1 column from the mother dataset and 1 column from the child
		let inputs = this.Inputs.Selected;
		if(inputs.length == 2) {
			let PromiseMother = new Promise(function(resolve) {
				inputs[0].Parser.bulk(function(dataMother) { //It is assumed that the data are not big here
					let Mother = [inputs[0].Headers].concat(dataMother);
					resolve(Mother);
				});
			});
			let PromiseChild = new Promise(function(resolve) {
				inputs[1].Parser.bulk(function(dataChild) { //It is assumed that the data are not big here
					let Child = [inputs[1].Headers].concat(dataChild);
					resolve(Child);
				});
			});
			Promise.all([PromiseMother, PromiseChild]).then(function(values) {
				let M = values[0]; //Mother data
				let C = values[1]; //Child data
				let lines = M.length;
				let cols = M[0].length;
				let info = "<p>Intertwined Child data (\"" + inputs[1].Name + ")\" within \"" + inputs[0].Name + "\".</p>";
				let out = "";
				for(let i=0;i<lines;i++) {
					for(let j=0;j<cols;j++) {
						let c = "";
						if(C[i]) {c = (C[i][j] || "")} //Cases were there is less child elements
						out += M[i][j] + "\t" + c + "\t";
					}
					out += "\n";
				}
				this.OutputTab.addTab({Label: "Intertwin", Controls: ["Delete"], Content: {Type: "HTML", Value: info + this.textArea(out)}, SetActive: true});
			}.bind(this));
		}
		else {alert("Two inputs must be selected!")}
	}
	static flatten() { //Flatten a set of data by appending all elements into a single column. Headers are ignored.
		let inputs = this.Inputs.Selected;
		if(inputs.length == 1) {
			inputs[0].Parser.bulk(function(data) { //It is assumed that the data are not big here
				let out = "";
				let lines = data.length;
				let cols = data[0].length;
				for(let j=0;j<cols;j++) {
					for(let i=0;i<lines;i++) {
						let m = data[i][j];
						if(m && m != "") {out += m + "\n"}
					}
				}
				let info = "<p>Flattened data from \"" + inputs[0].Name + "\".</p>";
				this.OutputTab.addTab({Label: "Flatten", Controls: ["Delete"], Content: {Type: "HTML", Value: info + this.textArea(out)}, SetActive: true});
			}.bind(this));
		}
		else {alert("One input must be selected!")}
	}
	static transpose() { //Same as flatten, but with a transposition step
		let inputs = this.Inputs.Selected;
		if(inputs.length == 1) {
			inputs[0].Parser.bulk(function(data) { //It is assumed that the data are not big here
				let out = "";
				let lines = data.length;
				let cols = data[0].length;
				for(let i=0;i<lines;i++) {
					for(let j=0;j<cols;j++) {
						let m = data[i][j];
						if(m && m != "") {out += m + "\n"}
					}
				}
				let info = "<p>Transposed data from \"" + inputs[0].Name + "\".</p>";
				this.OutputTab.addTab({Label: "Transpose", Controls: ["Delete"], Content: {Type: "HTML", Value: info + this.textArea(out)}, SetActive: true});
			}.bind(this));
		}
		else {alert("One input must be selected!")}
	}
	static order() { //Order by ascending wells (A1, A2, A3... basis) for a plate of 96 wells
		let inputs = this.Inputs.Selected;
		if(inputs.length == 1) {
			inputs[0].Parser.bulk(function(data) { //It is assumed that the data are not big here
				let out = "";
				let ordered = new Array(96); //Prepare an empty array (note that this is not an array of 96 elements defaulting to null or undefined, it is really an empty array
				let lines = data.length;
				let cols = data[0].length;
				data.forEach(function(d) { //Sort the items
					let well = Well.parseIndex(d[0], {Cols: 12, Rows: 8}); //1st column expected to be the well name
					if(well !== undefined) {ordered[well.Index] = d}
				});
				ordered.forEach(function(d, i) { //Prepare the output string. Because the array is initialized empty, empty elements will not give an empty row, they are just not processed
					out += d.reduce(function(acc, val, j) {
						if(j > 0) {return acc + "\t" + val}
						else {return val}
					}, "");
					out += "\n";
				});
				let info = "<p>Reordered data from \"" + inputs[0].Name + "\".</p>";
				this.OutputTab.addTab({Label: "Reorder", Controls: ["Delete"], Content: {Type: "HTML", Value: info + this.textArea(out)}, SetActive: true});
			}.bind(this));
		}
		else {alert("One input must be selected!")}
	}
	static match() { //Match elements from the Child list within the Mother list (The first columns will be used)
		let inputs = this.Inputs.Selected;
		if(inputs.length != 2) {alert("Two inputs must be selected!"); return}
		GetId("Progress").innerHTML = "";
		let lM = inputs[0].Parser.SelectedRows;
		if(inputs[0].Parser.Options.NoHeaders.getValue() == false) {lM--}
		let lC = inputs[1].Parser.SelectedRows;
		if(inputs[1].Parser.Options.NoHeaders.getValue() == false) {lC--}
		let header = inputs[0].Headers[0] + " (Mother)\t";
		inputs[1].Headers.forEach(function(h) {header += h + "\t"})
		header += "\n";
		let MaxThread = navigator.hardwareConcurrency;
		let list = [];
		for(let i=1;i<=MaxThread;i++) {
			list.push(i);
		}
		let chunkSize = LinkCtrl.new("Number", {ID: "Match_Controls", Label: "Chunk Size", Title: "Adjust the size of the chunk from mother to be matched against child", Default: 1000, Min: 10, Max: 100000, Chain: {Index: 0}});
		let thread = LinkCtrl.new("Select", {ID: "Match_Controls", Label: "Threads", Title: "Number of threads (workers) to be used", Default: 0, List: list, Chain: {Index: 1, Last: true}});
		chunkSize.init();
		thread.init();
		this.MatchData = {
			Inputs: inputs,
			MotherLines: lM,
			ChildLines: lC,
			Matches: 0,
			Percent: 0,
			Header: header,
			CurrentMotherRow: 0,
			CurrentChildRow: 0,
			ChunkSize: chunkSize,
			Threads: thread,
		}
		let buttons = [
			{Label: "Start", Click: function() {this.matchStart()}.bind(this), Title: "Start the matching process"},
			{Label: "Pause", Click: function() {this.matchProgress("pauseWait"); this.Workers.forEach(function(w) {w.postMessage({Pause: true})})}.bind(this), Title: "Pause the matching process"},
			{Label: "Resume", Click: function() {this.Workers.forEach(function(w) {w.postMessage({Resume: true})})}.bind(this), Title: "Resume the matching process"},
			{Label: "Cancel", Click: function() {this.matchProgress("cancel"); this.matchStop()}.bind(this), Title: "Cancel the matching process"},
		];
		GetId("Match_Controls").append(LinkCtrl.buttonBar(buttons)); //initialize the buttons
		this.matchProgress("start");
		this.OutputTab.addTab({Label: "Match", Controls: ["Delete"], Content: {Type: "HTML", Value: this.textArea(header, "Output_match")}, SetActive: true});
	}
	static matchProgress(state) {
		let O = this.MatchData;
		let msg = "";
		let percent = "Completed " + O.CurrentMotherRow + " rows (" + O.Percent + "%). ";
		let match = "Found " + O.Matches + " matches.";
		switch(state) {
			case "start": msg = "Ready to match '<i>" + O.Inputs[1].Name + "</i>' (Child) within '<i>" + O.Inputs[0].Name + "</i>' (Mother). Click Start to proceed"; break;
			case "pauseWait":  msg = "Waiting for worker to pause... "; break;
			case "Paused": msg = "Worker paused. " + percent + match; break;
			case "cancel": msg = "Work cancelled. " + percent + match; break;
			case "resumeWait": msg = "Resuming work... "; break;
			case "done": msg = "Match completed! " + match; break;
			default: msg = "Match on-going... " + percent + match;
		}
		GetId("Progress").innerHTML = "<p>" + msg + "</p>";
	}
	static matchStop() {
		GetId("Match_Controls").innerHTML = "";
		this.Workers.forEach(function(w) {w.terminate()});
		this.Workers = undefined; //Garbage collection
	}
	static matchStart() { //Start the match
		let O = this.MatchData;
		let n = O.Threads.Selected;
		O.Threads = n; //Fix the value for all the process
		this.Workers = [];
		for(let i=0;i<n;i++) { //Initialize all the subworkers
			this.Workers.push(this.matchWorker(i));
		}
		O.Results = Array(O.ChunkSize.getValue()).fill("");
		O.Done = Array(n).fill(false);
		this.matchProgress(); console.log("started");
		this.matchNext(n);
	}
	static matchNext(n, I) {
		let O = this.MatchData;
		if(I) {
			O.Results = O.Results.map(function(r, j) {
				if(I.Results[j]) {return r + I.Results[j]}
				else {return r}
			});
			O.Done[I.WorkerDone] = true;
			let bool = O.Done.reduce(function(a, b) {return a && b});
			if(bool == false) { //Wait for all worker to submit their results
				return;
			}
			else { //All workers have finished
				if(O.CurrentChildRow >= O.ChildLines) { //All child rows processed:
					O.CurrentMotherRow += I.MotherDone; //This chunk of mother is done and need to move to the next one
					let dom = GetId("Output_match");
					let out = O.Results.reduce(function(a, b) {
						if(b != "") {return a + "\n" + b }
						else {return a}
					});
					dom.append(out + "\n");
					O.Results = Array(O.ChunkSize.getValue()).fill("");
				}
				O.Done = Array(n).fill(false);
			}
		}
		if(O.CurrentMotherRow >= O.MotherLines) { //All mother rows processed
			this.matchProgress("done"); console.log("done");
			this.matchStop();
			return;
		}
		if(O.CurrentChildRow == 0 || O.CurrentChildRow >= O.ChildLines) { //All child rows processed
			this.Workers.forEach(function(w) {w.postMessage({Reset: true})});
			O.CurrentChildRow = 0; //Restart streaming the child with another chunk from mother
			Promise.all([this.chunkMother(), this.chunkChild(n)]).then(function() { //Stream the mother and child in parallel
				this.Workers.forEach(function(w) {w.postMessage({StartMatching: true})}); //When done, send a signal to the workers to start processing
			}.bind(this));
		}
		else { //Continue streaming the child
			this.chunkChild(n).then(function() {
				this.Workers.forEach(function(w) {w.postMessage({StartMatching: true})});
			}.bind(this));
		}
	}
	static chunkMother() { //Send the mother to each of the worker
		let O = this.MatchData;
		let limit = O.CurrentMotherRow + O.ChunkSize.getValue();
		let k = 0;
		return new Promise(function(resolve) {
			O.Inputs[0].Parser.stream(function(R, Mline, parser) { //Chunk the mother to the workers
				if(Mline >= O.CurrentMotherRow) {
					if(Mline < limit) {
						this.Workers.forEach(function (w) {w.postMessage({Mother: R[0]})});
						O.Results[k] += R[0];
						k++;
					}
					else {parser.abort()}
				}
			}.bind(this), function() { //On complete (will fire when the parser is aborted)
				resolve()
			}.bind(this));
		}.bind(this));
	}
	static chunkChild(n) { //Chunk a piece of child in each worker
		let O = this.MatchData;
		let limit = O.ChunkSize.getValue();
		if(O.ChildLines - O.CurrentChildRow < n * O.ChunkSize.getValue()) {limit = Math.ceil((O.ChildLines - O.CurrentChildRow) / n)} //Share the remaining workload equally
		let i = 0;
		return new Promise(function(resolve) {
			O.Inputs[1].Parser.stream(function(R, Mline, parser) { //Chunk the child to the workers
				if(Mline >= O.CurrentChildRow) {
					if(Mline >= O.CurrentChildRow + (i+1) * limit) {
						i++;
						if(i >= n) {parser.abort()}
						else {this.Workers[i].postMessage({Child: R})}
					}
					else {this.Workers[i].postMessage({Child: R})}
				}
			}.bind(this), function() { //On complete (will fire when the parser is aborted)
				resolve();
			}.bind(this));
		}.bind(this));
	}
	static matchWorker(index) { //What the worker will do on incoming message
		let f = function(e) { //Need to return a function that will be converted to a string and injected in the embedded worker through blob
			let I = e.data; //Incoming object
			if(I.Pause) {self.Running = false; return}
			if(I.Resume) {
				if(self.Running == false) {
					self.Running = true;
					postMessage({Resume: true});
					return;
				}
			}
			if(self.Running) {
				if(I.Reset) {self.Mother = []; return}
				if(I.Mother) {self.Mother.push(I.Mother); return}
				if(I.Child) {self.Child.push(I.Child); return}
				if(I.StartMatching) {
					let matches = Array(self.Mother.length).fill("");
					self.Mother.forEach(function(m, i) {
						self.Child.forEach(function(c, j) {
							if(m == c[0]) {
								let out = "";
								c.forEach(function(d) {out += "\t" + d});
								matches[i] += out;
								postMessage({Match: true});
							}
						});
					});
					postMessage({Done: true, ChildDone: self.Child.length, MotherDone: self.Mother.length, Results: matches, Index: self.Index});
					self.Child = []; //Reset the child to receive new chunk
				}
				if(!self.Running) {postMessage({Paused: true})}
			}
			else {postMessage({Paused: true})}
		}
		let blob = new Blob(["self.Index = " + index + "; self.Mother = []; self.Child = []; self.Running = true; onmessage = " + f.toString()], {type: "application/javascript"});
		let w = new Worker(URL.createObjectURL(blob));
		w.onmessage = function(e) {
			let R = e.data;
			let O = this.MatchData;
			if(R.Match) {O.Matches++; return}
			if(R.Done) {
				O.Percent += 100 * ((R.ChildDone * R.MotherDone) / (O.MotherLines * O.ChildLines));
				O.CurrentChildRow += R.ChildDone;
				this.matchNext(O.Threads, {WorkerDone: R.Index, MotherDone: R.MotherDone, Results: R.Results});
				this.matchProgress();
				return;
			}
			if(R.Resume) {
				this.matchProgress("resumeWait");
				this.matchNext(O.Threads);
				return;
			}
			if(R.Paused) {
				this.matchProgress("Paused");
			}
		}.bind(this);
		return w;
	}
	/*static stitch(I) {
		let inputs = this.Inputs.Selected;
		if(inputs.length != 1) {alert("One input must be selected!"); return}
		if(I === undefined) { //This mode is to parse the metadata only
			let h = inputs[0].Headers;
			let l = h.length;
			let meta = { //Prepare an object holding the meta information
				Channels: -1,
				ChannelNames: undefined,
				Positions: [],
				HighestField: 0,
				ResX: 0,
				ResY: 0,
				Index: {
					W: -1, //WellName
					C: -1, //Channel
					F: -1, //Field
					CN: -1, //ChannelNames
					X: -1, //X position
					Y: -1, //Y position
					FileName: -1, //FileName position
				}
			};
			let done = 0;
			let i = 0;
			while(done < 10 && i < l) { //Identify the column index using the header
				switch(h[i]) {
					case "WellName": meta.Index.W = i; done++; break; //Found Well column
					case "Channel": meta.Index.C = i; done++; break; //Found channel column
					case "Field": meta.Index.F = i; done++; break; //Found field column
					case "ChannelName": meta.Index.CN = i; done++; break; //Found channel column
					case "PositionX@um": meta.Index.X = i; done++; break; //Found X position column
					case "PositionY@um": meta.Index.Y = i; done++; break; //Found Y position column
					case "NumberOfChannels": meta.Channels = i; done++; break; //Found nb of channels
					case "sourcefilename": meta.Index.FileName = i; done++; break; //Found nb of channels
					case "ImageResolutionX@um": meta.ResX = i; done++; break; //Found resolution X
					case "ImageResolutionY@um": meta.ResY = i; done++; break; //Found resolution Y
				}
				i++;
			}
			if(done < 10) {alert("Could not find all required columns..."); return}
			inputs[0].Parser.stream(function(row, line, parser) { //Columbus files are big, so stream is appropriate
				if(line == 0) { //Log the constants using first row
					meta.Channels = Number(row[meta.Channels]);
					meta.ChannelNames = Array(meta.Channels); //Generate empty array
					meta.ResX = Number(row[meta.ResX]); //Positions are defined in um and need to be converted in px for correct stitching
					meta.ResY = Number(row[meta.ResY]);
				}
				if(line < meta.Channels) { //Record the channel names on the first lines
					let n = Number(row[meta.Index.C]) - 1;
					meta.ChannelNames[n] = row[meta.Index.CN];
				}
				let field = Number(row[meta.Index.F]);
				if(field > meta.HighestField) { //Found a new field
					meta.Positions.push({F: field, X: row[meta.Index.X], Y: row[meta.Index.Y]}); //Log the positions
					meta.HighestField = field;
				}
				else {if(field < meta.HighestField) {parser.abort()}} //All fields were found, no need to travel the rest of the file
			}.bind(this), function(totalLines) {this.stitch_OutputConfig(meta)}.bind(this)); //Completion function
		}
		else { //Prepare the output using passed configuration
			let zip = new JSZip();
			GetId("ZipDownload").innerHTML = "Preparing files, please wait...";
			let w = I.Meta.Index.W; //Shortcuts for the indices
			let x = I.Meta.Index.X;
			let y = I.Meta.Index.Y;
			let c = I.Meta.Index.CN;
			let f = I.Meta.Index.FileName;
			let Rx = I.Meta.ResX;
			let Ry = I.Meta.ResY;
			let channel = I.Channel;
			let currentWell = "";
			let out = "";
			inputs[0].Parser.stream(function(row, line, parser) {
				let well = row[w];
				if(well == currentWell) { //Accumulate the data in the buffer
					out += row[f] + ";;(" + Math.round(row[x] / Rx) + ", " + Math.round(-row[y] / Ry) + ")\n";
				}
				else {
					if(line > 0) { //Create the zip file, except at the first row because the buffer is empty
						zip.file(currentWell + "_TileConfig.txt", out);
					}
					currentWell = well;
					out = "dim = 2\n" + row[f] + ";;(" + Math.round(row[x] / Rx) + ", " + Math.round(-row[y] / Ry) + ")\n";; //Reset the buffer with the new row; don't forget the header!
				}
			}.bind(this), function(totalLines) { //Completion function
				zip.file(currentWell + "_TileConfig.txt", out); //The last well
				zip.generateAsync({type: "base64"}).then(function(b) {
					GetId("ZipDownload").innerHTML = "Click <a href=\"data:application/zip;base64," + b + "\">this link</a> to download the zip folder containing your files";
				});
			}.bind(this));
		}
	}
	static stitch_OutputConfig(meta) { //A form indicating the results of meta parsing and asking the user for the desired output configuration
		let id = "FormStitch";
		let channelSelect = LinkCtrl.new("Select", {ID: "ChannelSelect", Label: "Channel", Default: 0, List: meta.ChannelNames, Title: "Select the channel for stitching"});
		let html = "";
		html += "<p><b>Metadata information found:</b>";
		html += "<ul><li>Channels: " + meta.Channels + "</li>";
		html += "<li>Fields: " + meta.HighestField + "</li></ul></p>";
		html += "<p>Select the desired channel and click <i>Proceed</i> to continue"
		html += "<div id=\"ChannelSelect\"></div></p>";
		html += "<div id=\"ZipDownload\"></div></p>";
		Form.open({
			ID: id,
			HTML: html,
			Title: "Metadata",
			Buttons: [
				{Label: "Proceed", Click: function() {Helper.stitch({Meta: meta, Channel: channelSelect.Selected})}},
				{Label: "Done", Click: function() {Form.close(id)}}
			],
			onInit: function() {channelSelect.init()}
		});
	}*/
}