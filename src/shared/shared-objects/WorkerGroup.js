//***************************************************************************************
// WORKER object - Class for spawning and handling input/output to a set of webworkers
//***************************************************************************************
class WorkerGroup {
	constructor(I) {
		this.Anchors = {
			Root: I.ID,
			Options: I.ID + "_Options",
			Controls: I.ID + "_Controls",
			Progress: I.ID + "_Progress",
		}
		this.Process = {
			workerProcess: I.workerProcess, //function to execute inside the worker
			joinResults: I.joinResults, //function to execute while receiving data from an independent Worker. Typically the data should be merged together
			checkChunkDone: I.checkChunkDone, //function to execute to check if the current chunk is done and if it is possible to move to the next chunk
			nextChunk: I.nextChunk, //Function to execute while moving to the next chunk
		}
		let MaxThread = navigator.hardwareConcurrency;
		let list = [];
		for(let i=1; i <= MaxThread; i++) {list.push(i)} //Create a simple list to select the number of workers desired
		this.Options = { //Options for the worker group
			ChunkSize: LinkCtrl.new("Number", {
				ID: this.Anchors.Options, Label: "Chunk Size", Title: "Size of the chunks to be transfered to each worker",
				Default: 1000, Min: 10, Max: 100000,
				Chain: {Index: 0}
			}),
			Thread: LinkCtrl.new("Select", {
				ID: this.Anchors.Options, Label: "Threads", Title: "Number of workers to use",
				List: list, Default: MaxThread - 1, //Will use the max number of threads as default
				Chain: {Index: 1, Last: true}
			}),
		}
		GetId(this.Anchors.Root).insertAdjacentHTML("afterbegin", "<div id='" + this.Anchors.Options + "'></div><div id='" + this.Anchors.Controls + "'></div><div id='" + this.Anchors.Progress + "'></div>"); //Create the html elements to host the worker options, controls and progress fields
		Object.values(this.Options).forEach(function(t) {t.init()}); //initialize the options
		this.Data = { //Object used to track the progress of the process
			Percent: 0,
			TotalRows: I.TotalRows,
			CurrentRow: 0,
		}
		let buttons = [
			{Label: "Start", Click: function() {this.start()}.bind(this), Title: "Start the process"},
			{Label: "Pause", Click: function() {this.pause()}.bind(this), Title: "Pause the process"},
			{Label: "Resume", Click: function() {this.resume()}.bind(this), Title: "Resume the process"},
			{Label: "Cancel", Click: function() {this.stop()}.bind(this), Title: "Cancel the process"},
		];
		if(this.Anchors.Controls !== null) {
			GetId(this.Anchors.Controls).append(LinkCtrl.buttonBar(buttons)); //initialize the buttons
		}
		this.processStatus("start");
	}
	//Static Methods
	
	//Methods
	processStatus(state) {
		if(this.Anchors.Progress === null) {return} //No need to do anything if there is no spot to display the status message
		let O = this.Data;
		let msg = "";
		let percent = "Completed " + O.CurrentRow + " rows (" + O.Percent + "%). ";
		switch(state) {
			case "start": msg = "Ready to go! Click Start to proceed"; break;
			case "pauseWait":  msg = "Waiting for worker to pause... "; break;
			case "Paused": msg = "Worker paused. " + percent; break;
			case "cancel": msg = "Work cancelled. " + percent; break;
			case "resumeWait": msg = "Resuming work... "; break;
			case "done": msg = "Work completed! "; break;
			default: msg = "Work on-going... " + percent;
		}
		GetId(this.Anchors.Progress).innerHTML = "<p>" + msg + "</p>";
	}
	start() {
		let n = this.Options.Thread.Selected;
		let chunk = this.Options.ChunkSize.getValue();
		this.Data.Thread = n; //Log the number of thread at the start and always refer to this fixed value during the process
		this.Workers = [];
		for(let i=0; i < n; i++) { //Initialize all the subworkers
			this.Workers.push(this.spawnWorker(i));
		}
		this.Data.Results = Array(chunk).fill(""); //Array to store the Results received from each worker
		this.Data.Done = Array(n).fill(false); //Array to determine which worker is done or still running
		this.processStatus();
		this.nextChunk(this.Data);
	}
	pause() {
		this.processStatus("pauseWait");
		this.Workers.forEach(function(w) {
			w.postMessage({Pause: true});
		});
	}
	resume() {
		this.Workers.forEach(function(w) {
			w.postMessage({Resume: true});
		});
	}
	cancel() {
		this.processStatus("cancel");
		this.Workers.forEach(function(w) {w.terminate()}); //Kill the workers
		this.Workers = undefined; //Garbage collection
	}
	onWorkerMessage(n, I) { //The main thread received a message from a worker
		let O = this.Data;
		this.Process.joinResults(O, I); //Join the results from each worker into a single result output
		O.Done[I.WorkerDone] = true;
		let bool = O.Done.reduce(function(a, b) {return a && b}); //Check if there are still workers processing some data
		if(bool == false) { //Wait for all worker to submit their results
			return;
		}
		else { //All workers have finished
			if(this.Process.checkChunkDone(O, I)) { //Check if the conditions are met to pass to the next chunk
				this.nextChunk(O, I);
				O.Results = Array(O.ChunkSize.getValue()).fill("");
			}
			O.Done = Array(n).fill(false);
		}
	}
	nextChunk(O, I) {	
		if(O.CurrentRow >= O.TotalRows) { //All rows have been processed, terminate
			this.processStatus("done");
			this.stop();
			return;
		}
		this.Process.nextChunk(O, I);
	}
	spawnWorker(index) { //Spawn the worker at index i
		//Prepare the function to be injected inside the worker, to be executed as onmessage event
		let f = "function(e) {"; //Need to prepare the function as a string to be injected in the embedded worker through blob
		f+= "let I = e.data;"; //Incoming object
		f+= "if(I.Pause) {self.Running = false; return}";
		f+= "if(I.Resume) {";
		f+= "	if(self.Running == false) {";
		f+= "		self.Running = true;";
		f+= "		postMessage({Resume: true});";
		f+= "		return;";
		f+= "	}";
		f+= "}";
		f+= "if(self.Running) {"
		f+= this.Process.workerProcess().toString(); //Append the full code of the function to be executed inside the worker
				//Instructions with postMessage({Done: true}) is required 
		f+= "	if(!self.Running) {postMessage({Paused: true})}";
		f+= "}";
		f+= "else {postMessage({Paused: true})}";
		f+= "}";
		//Create the worker with the above instructions
		let blob = new Blob(["self.Index = " + index + "; self.Running = true; onmessage = " + f], {type: "application/javascript"});
		let w = new Worker(URL.createObjectURL(blob));
		//Create the code to be executed on the main thread when the worker sends its message
		w.onmessage = function(e) { //What to do when the worker sends a message
			let R = e.data; //Data received from the worker
			let O = this.Data;
			if(R.Done) {
				this.onWorkerMessage(O, I);
				this.processStatus(); //Update the status after the onWorkerMessage function is done, so that changes in % completion are displayed accordingly
				return;
			}
			if(R.Resume) {
				this.processStatus("resumeWait");
				this.onWorkerMessage(O, I);
				return;
			}
			if(R.Paused) {
				this.processStatus("Paused");
				return;
			}
		}.bind(this);
		return w;
	}
}