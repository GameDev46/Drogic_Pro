const gateSelect = document.getElementById("gate");
const gateButton = document.getElementById("add-gate");

// Camera data
let scroll = {
	changeX: 0,
	changeY: 0,
	lastX: 0,
	lastY: 0,
	hasBeenDragged: false,
	dragging: false,
	x: 0,
	y: 0,
	zoom: 100
}

// Workspace interactions and objects data
let world = {
	textBoxes: {},
	draggedTextbox: -1,
	uniqueTexboxID: 0,
	gates: {},
	draggedGates: -1,
	uniqueGateId: 0,
	mouseWireConnection: -1,
	focusedWired: -1,
	undoList: [],
	maxTickRate: 60,
	screenSize: 8
}

// Records whether keys are currently pressed
let keyboard = [];

document.addEventListener("keydown", e => {

	if (keyboard[e.key.toUpperCase()]) return;
	keyboard[e.key.toUpperCase()] = true;

	for (let item in world.gates) {
		if (world.gates[item].type == "keyboard") world.gates[item].run();
	}
})

document.addEventListener("keyup", e => {
	keyboard[e.key.toUpperCase()] = false;

	for (let item in world.gates) {
		if (world.gates[item].type == "keyboard") world.gates[item].run();
	}
})

// Unused as of now - plan to add this back in a future update
let undoList = [];

// Load each objects sound effect
let websiteAudio = {
	cachedDrop: new Audio("./sounds/drop.wav"),
	cachedDrop2: new Audio("./sounds/drop2.wav"),
	cachedConnect: new Audio("./sounds/connect2.wav"),
	cachedConnect2: new Audio("./sounds/connect.wav"),
	cachedDelete: new Audio("./sounds/connect.wav"),
	cachedCreate: new Audio("./sounds/connect.wav"),
	drop: function() {
		let tempAudio = this.cachedDrop;

		tempAudio.currentTime = 0;
		tempAudio.volume = 1;
		tempAudio.play();
	},
	pickup: function() {
		let tempAudio = this.cachedDrop2;

		tempAudio.currentTime = 0;
		tempAudio.volume = 1;
		tempAudio.play();
	},
	addText: function() {
		let tempAudio = this.cachedDrop;

		tempAudio.currentTime = 0;
		tempAudio.play();
	},
	connectDrag: function() {
		let tempAudio = this.cachedConnect;

		tempAudio.currentTime = 1000;
		tempAudio.play();
	},
	switch: function() {
		let tempAudio = this.cachedConnect2;

		tempAudio.currentTime = 0;
		tempAudio.play();
	},
	delete: function() {
		let tempAudio = this.cachedDelete;

		tempAudio.currentTime = 0;
		tempAudio.play();
	},
	create: function() {
		let tempAudio = this.cachedCreate;

		tempAudio.currentTime = 0;
		tempAudio.play();
	} 
}

// Load in the canvas element
const canvas = document.getElementById("background-canvas");
const ctx = canvas.getContext("2d");

// Listen for when the "add node" button is clicked
gateButton.addEventListener("click", e => {
	addGate(e);
})

// Adds the specified logic gate tp the scene - loadedGateInfo is for loading in gates with preset information
function addGate(e, loadedGateInfo=-1) {

	// Create the gate holder
	let newGateHolder = document.createElement("div");
	newGateHolder.classList.add("logic-gate");
	
	// Create the solid background of the main gate
	let newGate = document.createElement("div");
	newGate.id = "gate" + world.uniqueGateId;

	// Set the gate's id to be that of the loaded gates
	if (loadedGateInfo != -1) newGate.id = "gate" + loadedGateInfo.id;

	// Create the gate name element
	let newGateH2 = document.createElement("h2");
	newGateH2.innerText = gateSelect.value;

	// If loaded gate then set the type to the loaded gates type
	if (loadedGateInfo != -1) newGateH2.innerText = loadedGateInfo.type;

	// Create the gates icon
	let newGateImage = document.createElement("img");
	newGateImage.src = "./images/" + gateSelect.value + ".svg";

	// If loaded gate then load saved image
	if (loadedGateInfo != -1) newGateImage.src = "./images/" + loadedGateInfo.type + ".svg";

	//if (gateSelect.value == "buffer") newGateImage.src = "images/" + gateSelect.value + ".png";
	newGateImage.alt = gateSelect.value + " gate";
	newGateImage.onerror = function() {
		this.style.opacity = 0;
		this.style.height = "27px";
	}

	// Append all the elements to the gate holder
	newGate.appendChild(newGateImage);
	newGate.appendChild(newGateH2);
	newGateHolder.appendChild(newGate)

	// Add the objects to the workspace
	document.getElementById("logic-gate-holder").appendChild(newGateHolder);

	// Define the gate data
	let gateObject = {
		type: gateSelect.value,						// The type of the gate
		id: world.uniqueGateId,						// The gates unique ID
		element: newGate,							// The gate draggable element
		connections: [],							// The gates which are connected to its outputs
		backConnections: [],						// The gates which are connected to its inputs
		maxInputs: 2,								// The maximum number of different inputs
		maxOutputs: 1,								// The maximum number of different outputs
		inputs: [],									// The state of each input (true or false)
		inputNames: ["Bit 1", "Bit 2", "Carry"],	// The name of each input
		inputTaken: [],								// Whether the input is already in use
		inputElements: [],							// The workspace element for each input
		output: [],									// The state of each output (true or false)
		outputNames: ["Out", "Carry"],				// The name of each output
		outputTaken: [],							// Whether the output is already in use
		outputElements: [],							// The workspace element for each output
		deleteButton: null,							// Reference to the gate's delete button
		toggleOn: false,							// Used for checking input gates states
		inputOn: false,								// Laso used for checking input gates states
		ramMemory: {},								// Used for storing information within each logic gate
		x: -10 + scroll.x,							// The gate's global X position
		y: -100 + scroll.y,							// The gate's global Y position
		hasSetupInputsAndOutputs: false,			// Whether the gate has created and setup its inputs and outputs
		setupInputsAndOutputs: function() {

			// Stop function from being called multiple times
			if (this.hasSetupInputsAndOutputs) return;
			this.hasSetupInputsAndOutputs = true;

			// Setup all the input states
			for (let i = 0; i < this.maxInputs; i++) {
				this.inputs.push(false);
				this.inputTaken.push(false);
			}
			
			// Setup all the output states
			for (let i = 0; i < this.maxOutputs; i++) {
				this.output.push(false);
				this.outputTaken.push(false);
			}

		},
		runConnections: function(isHigh, outputId=0) {
			// Activate or deactivate all the connected gates at a specified output

			if (this.output[outputId] == isHigh && !this.pulse) return;
			this.output[outputId] = isHigh;

			// Change output's colour
			this.outputElements[outputId].style.background = "rgb(208, 107, 107)";
			if (isHigh) this.outputElements[outputId].style.background = "rgb(132, 208, 107)";

			// Loop over the connections and update each one
			for (var i = 0; i < this.connections.length; i++) {
				let connectionID = this.connections[i];

				if (connectionID.outputID != outputId) continue;

				world.gates[connectionID.gateID].inputs[connectionID.inputID] = this.output[outputId];
				world.gates[connectionID.gateID].run();
			}
		},
		run: function(isPulse=false, data={}) {

			this.setupInputsAndOutputs();

			// A pulse is sent whenever a gate is created to properly setup each gate before it can be used
			this.pulse = isPulse;

			// INPUT, OUTPUT and TOGGLE

			if (this.type == "input") {
				if (!isPulse) this.inputOn = !this.inputOn;
				this.runConnections(this.inputOn);
			}
			
			if (this.type == "output") {

				let foundOn = false;
				for (var i = 0; i < this.inputs.length; i++) {
					if (this.inputs[i] == true) foundOn = true;
				}

				if (foundOn) {
					this.element.style.background = "rgba(232,255,125,1)";
					this.element.style.boxShadow = "0 0 20px rgba(245, 245, 120, 0.7)";
				}
				else {
					this.element.style.background = "var(--whiteColour)";		
					this.element.style.boxShadow = "none";
				}

				this.runConnections(foundOn);
				return;
			}
			
			
			if (this.type == "toggle") {
				
				if (this.inputs[0] && !this.inputOn) this.toggleOn = !this.toggleOn;
				this.inputOn = this.inputs[0];

				if (this.toggleOn) {
					this.element.style.background = "rgba(255,255,150,1)";
					this.element.style.boxShadow = "0 0 20px rgba(222, 245, 222, 0.7)";
				}
				else {
					this.element.style.background = "var(--whiteColour)";		
					this.element.style.boxShadow = "none";
				}

				this.runConnections(this.toggleOn);
			}
			
			// LOGIC GATES

			if (this.type == "buffer") this.runConnections(this.inputs[0]);

			if (this.type == "and") this.runConnections(this.inputs[0] && this.inputs[1]);

			if (this.type == "nand") this.runConnections(!(this.inputs[0] && this.inputs[1]));

			if (this.type == "not") this.runConnections(!this.inputs[0]);

			if (this.type == "or") this.runConnections(this.inputs[0] || this.inputs[1]);

			if (this.type == "nor") this.runConnections(!this.inputs[0] && !this.inputs[1]);

			if (this.type == "xor") this.runConnections( (this.inputs[0] || this.inputs[1]) && (this.inputs[0] != this.inputs[1]) );
			
			if (this.type == "adder") {

				let bit1 = this.inputs[0];
				let bit2 = this.inputs[1];
				let carryIn = this.inputs[2];

				let xorBit1Bit2 = (bit1 || bit2) && (bit1 != bit2)
				let xorBit1Bit2Carry = (xorBit1Bit2 || carryIn) && (xorBit1Bit2 != carryIn)

				let total = (bit1 * 1) + (bit2 * 1) + (carryIn * 1)
				
				// Output the sum
				this.runConnections(xorBit1Bit2Carry, 0)

				// Output the carry
				this.runConnections(total > 1, 1)
				
			}

			// LATCHES

			if (this.type == "latch") {
				if (this.inputs[1] && !this.toggleOn) this.inputOn = this.inputs[0];
				this.toggleOn = this.inputs[1];
				
				this.runConnections(this.inputOn, 0)
				this.runConnections(!this.inputOn, 1)

				if (this.inputOn) {
					this.element.style.background = "rgba(150,255,150,1)";
					this.element.style.boxShadow = "0 0 20px rgba(150, 245, 150, 0.7)";
				}
				else {
					this.element.style.background = "var(--whiteColour)";		
					this.element.style.boxShadow = "none";
				}
			}

			if (this.type == "8BitLatch") {

				if (this.inputs[10] && !this.toggleOn) {
					for (let i = 0; i < 8; i++) {
						this.ramMemory["bit" + i] = this.inputs[i + 1];
						this.runConnections(this.ramMemory["bit" + i], i + 1);
					}
				}

				this.toggleOn = this.inputs[10];

				// Update helper UI
				let outBinaryString = "";
				let outBinaryNum = 0;

				for (let i = 0; i < 8; i++) {
					if(this.ramMemory["bit" + i]) {
						outBinaryString = "1" + outBinaryString;
						outBinaryNum += Math.pow(2, i);
					}
					else {
						outBinaryString = "0" + outBinaryString;
					}
				}

				this.infoBox.children[0].innerText = outBinaryNum + "\n" + outBinaryString
			}

			// DECIMAL INPUT

			if (this.type == "decimal") {

				if (isPulse) this.infoBox.children[0].value = this.ramMemory["dec"];

				let decimalVal = 0;
				let binaryString = "0000000";

				if (data["inputType"] == "dec" && !isPulse) {

					let str = this.infoBox.children[0].value;

					if (typeof str != "string") str = "0";
					if (isNaN(str) || isNaN(parseFloat(str))) str = "0";

					this.ramMemory["dec"] = Number(this.infoBox.children[0].value);

					decimalVal = Number(this.infoBox.children[0].value);
					binaryString = Number( Math.min( Number(str), 255 ) ).toString(2).substring(0, 8);

					for (let i = 0; binaryString.length < 8; i++) {
						binaryString = "0" + binaryString;
					}
				}

				if (data["inputType"] == "bin" && !isPulse) {

					let bin = this.infoBox.children[1].value.substring(0, 8);
					
					for (let i = 0; bin.length < 8; i++) {
						bin = "0" + bin;
					}

					for (let i = 0; i < 8; i++) {
						if (bin[i] == "1") decimalVal +=  Math.pow(2, 7 - i);
					}

					this.ramMemory["dec"] = decimalVal;
					binaryString = bin;
				}

				for (let i = 0; i < 8; i++) {
					this.ramMemory["bit" + i] = binaryString[7-i] == "1" ? true : false;
					this.runConnections(this.ramMemory["bit" + i], i + 1);
				}

				// Update helper UI
				this.infoBox.children[0].value = decimalVal;
				this.infoBox.children[1].value = binaryString;

			}

			// KEYBOARD

			if (this.type == "keyboard") {

				if (!("char" in this.ramMemory)) this.ramMemory["char"] = "A";

				let activeKey = this.ramMemory["char"];
				this.infoBox.children[0].selected = this.ramMemory["char"];

				if (keyboard[activeKey]) {
					this.runConnections(true);
				} else {
					this.runConnections(false);
				}

			}

			// DELAY

			if (this.type == "delay") {

				if (!("delay" in this.ramMemory)) this.ramMemory["delay"] = 1000;

				let gateDelay = this.ramMemory["delay"];
				this.infoBox.children[0].value = this.ramMemory["delay"];

				if (data["delayEnd"]) {
					// Run the delayed inputs
					this.runConnections(data["isHigh"]);
				} else {
					let delayWait = setTimeout(this.run, this.ramMemory["delay"], [false, {"delayEnd": true, "isHigh": this.inputs[0]}]);
				}

			}

			// OSCILLATOR
			
			if (this.type == "oscillator") {

				let str = this.infoBox.children[0].value;

				if (typeof str != "string") str = "1";
				if (isNaN(str) || isNaN(parseFloat(str))) str = "1";

				if (isPulse) this.infoBox.children[0].value = this.ramMemory["freq"];
				if (this.ramMemory["lastFireTime"] == null) this.ramMemory["lastFireTime"] = Date.now() / 1000;

				if (!isPulse) this.ramMemory["freq"] = Number(this.infoBox.children[0].value);

				if (!isPulse) {
					if (this.ramMemory["lastFireTime"] + (1 / this.ramMemory["freq"]) < Date.now() / 1000) {
						this.inputOn = !this.inputOn;
						this.ramMemory["lastFireTime"] = Date.now() / 1000;
					}
				}

				this.runConnections(this.inputOn);
			}

			// SCREEN
			
			if (this.type == "screen") {

				// Update screen inputs
				if (this.toggleOn == this.inputs[9] && !isPulse) return;
				this.toggleOn = this.inputs[9];

				if (!isPulse) {

					let binaryXCoord = [this.inputs[1], this.inputs[2], this.inputs[3]]
					let binaryYCoord = [this.inputs[5], this.inputs[6], this.inputs[7]]

					let decimalXCoord = 0;
					let decimalYCoord = 0;

					for (let i = 0; i < 3; i++) {
						if (binaryXCoord[i]) decimalXCoord += Math.pow(2, i);
						if (binaryYCoord[i]) decimalYCoord += Math.pow(2, i);
					}

					this.ramMemory["pixel_" + decimalXCoord + ","+ decimalYCoord] = true;

				}

				let clearData = false;
				if (this.inputs[11]) clearData = true;

				for (let x = 0; x < world.screenSize; x++) {
					for (let y = 0; y < world.screenSize; y++) {
						if (this.ramMemory["pixel_" + x + ","+ y] == null) this.ramMemory["pixel_" + x + ","+ y] = false;

						if (clearData) this.ramMemory["pixel_" + x + ","+ y] = false;

						this.infoBox.children[0].children[x + (y * world.screenSize)].style.background = "rgb(13, 13, 13)";
						if (this.ramMemory["pixel_" + x + ","+ y]) this.infoBox.children[0].children[x + (y * world.screenSize)].style.background = "rgb(255, 255, 255)";
					}
				}

			}

			// ARITHMETIC LOGIC UNIT (ALU)

			if (this.type == "alu") {

				// Setup inputs

				// 21 = add, 22 = subtract
				let mode = "add";
				if (this.inputs[22]) mode = "subtract";
				if (this.inputs[23]) mode = "or";
				if (this.inputs[24]) mode = "and";
				if (this.inputs[25]) mode = "nand";
				if (this.inputs[26]) mode = "nor";
				if (this.inputs[27]) mode = "xor";

				let shift = 0;
				if (this.inputs[29]) shift = -1;
				if (this.inputs[30]) shift = 1;
				
				// 1-8 = num 1, 10-17 = num 2, 19 = carry
				let carryIn = this.inputs[19];

				let binaryNum1 = [];
				for (let i = 1; i < 9; i++) binaryNum1.push(this.inputs[i]);

				let binaryNum2 = [];
				for (let i = 10; i < 18; i++) binaryNum2.push(this.inputs[i]);

				let beginningNum2 = [];
				for (let i = 10; i < 18; i++) beginningNum2.push(this.inputs[i]);

				// Setup outputs
				let binaryOut = [];
				for (let i = 0; i < 8; i++) binaryOut.push(binaryNum1[i]);

				// Invert num 2 and add 1 if subtracting
				if (mode == "subtract") {
					for (let i = 0; i < 8; i++) binaryNum2[i] = !binaryNum2[i];

					let zeroBinary = [];
					for (let i = 0; i < 8; i++) zeroBinary.push(false);

					binaryNum2 = this.add8BitBinaryNumbers(binaryNum2, zeroBinary, true)[0];
				}
				
				if (mode == "add" || mode == "subtract") {
				// Perform addition
					let result = this.add8BitBinaryNumbers(binaryNum1, binaryNum2, carryIn);
					binaryOut = result[0];
					let carryOut = result[1];

					// Output the carry
					this.runConnections(carryOut, 10);
				} else {

					// Bitwise operations
					for (let i = 0; i < 8; i++) {
						let bit1 = binaryNum1[i];
						let bit2 = binaryNum2[i];

						if (mode == "or") binaryOut[i] = bit1 || bit2;
						if (mode == "and") binaryOut[i] = bit1 && bit2;
						if (mode == "nand") binaryOut[i] = !(bit1 && bit2);
						if (mode == "nor") binaryOut[i] = !(bit1 || bit2);
						if (mode == "xor") binaryOut[i] = (bit1 || bit2) && (bit1 != bit2);
					}

					// Clear carry out
					this.runConnections(false, 10);
				}

				if (shift == -1) {
					// Right shift
					let tempBinaryOut = [];
					for (let i = 0; i < 8; i++) tempBinaryOut.push(binaryOut[i]);

					for (let i = 0; i < 7; i++) binaryOut[i] = tempBinaryOut[i + 1];
					binaryOut[7] = false;
				}

				if (shift == 1) {
					// Left shift
					let tempBinaryOut = [];
					for (let i = 0; i < 8; i++) tempBinaryOut.push(binaryOut[i]);

					for (let i = 1; i < 8; i++) binaryOut[i] = tempBinaryOut[i - 1];
					binaryOut[0] = false;
				}

				// 1-8 = num out, 10 = carry
				for (let i = 1; i < 9; i++) this.runConnections(binaryOut[i - 1], i);

				// Update helper UI
				let outBinaryString = "";
				let outBinaryNum = 0;

				let inNum1String = "";
				let inNum1Value = 0;
				let inNum2String = "";
				let inNum2Value = 0;

				for (let i = 0; i < 8; i++) {
					if(binaryOut[i]) {
						outBinaryString = "1" + outBinaryString;
						outBinaryNum += Math.pow(2, i);
					}
					else {
						outBinaryString = "0" + outBinaryString;
					}

					if(binaryNum1[i]) {
						inNum1String = "1" + inNum1String;
						inNum1Value += Math.pow(2, i);
					}
					else {
						inNum1String = "0" + inNum1String;
					}

					if(beginningNum2[i]) {
						inNum2String = "1" + inNum2String;
						inNum2Value += Math.pow(2, i);
					}
					else {
						inNum2String = "0" + inNum2String;
					}
				}

				this.infoBox.children[0].innerText = inNum1Value + "\n" + inNum1String;
				this.infoBox.children[2].innerText = inNum2Value + "\n" + inNum2String;
				this.infoBox.children[4].innerText = outBinaryNum + "\n" + outBinaryString;

				this.infoBox.children[1].innerText = mode;
				
			}

			// RANDOM ACCESS MEMORY (RAM)

			if (this.type == "ram") {

				if (data["addData"]) {

					// Copy the values in the adress and value input fields
					let inputtedBinaryValue = this.infoBox.children[0].children[0].value.substring(0, 8);
					let inputtedBinaryAddress = this.infoBox.children[0].children[1].value.substring(0, 8);

					let formattedBinary = [];
					let formattedBinaryAddress = "";

					// Make sure binary value is 8 bits long
					for (let i = 0; inputtedBinaryValue.length < 8; i++) {
						inputtedBinaryValue = "0" + inputtedBinaryValue;
					}

					// Format the binary value into a list of true (1) and false (0) with index 0 being the most significant bit
					for (let i = 0; i < 8; i++) {
						formattedBinary.push( (inputtedBinaryValue[i] || "0") == "1" ? true : false );
					}

					// Make sure binary value is 8 bits long
					for (let i = 0; inputtedBinaryAddress.length < 8; i++) {
						inputtedBinaryAddress = "0" + inputtedBinaryAddress;
					}

					// Format the inputted binary adress into 1s and 0s
					for (let i = 0; i < 8; i++) {
						formattedBinaryAddress += inputtedBinaryAddress[i] == "1" ? "1" : "0";
					}

					// Save the value in the address
					this.ramMemory[formattedBinaryAddress] = formattedBinary;

					// Clear the adress and value input fields
					this.infoBox.children[0].children[0].value = "";
					this.infoBox.children[0].children[1].value = "";

				} else if (!isPulse) {

					// 19 = read, 20 = write
					let mode = "read";
					if (this.inputs[20]) mode = "write";
					if (this.inputs[21]) mode = "clear";

					let clock = this.inputs[23];
					
					// 1-8 = num - most significant bit first
					let binaryNumIn = [];
					for (let i = 8; i > 0; i--) binaryNumIn.push(this.inputs[i]);

					// 10-17 = address
					let binaryAddress = "";

					// Convert true / false list to a string of 1s and 0s - most significant bit first
					for (let i = 17; i > 9; i--) {
						binaryAddress += this.inputs[i] == true ? "1" : "0"
					}

					// Fetch the binary data
					let binaryOut = [];

					// Only run if the clock is pulsed from low to high
					if (clock && !this.inputOn) {	

						if (mode == "read") {
							binaryOut = [false,false,false,false,false,false,false,false];
							if (binaryAddress in this.ramMemory) binaryOut = this.ramMemory[binaryAddress];
						}

						if (mode == "write") this.ramMemory[binaryAddress] = binaryNumIn;
						if (mode == "clear") this.ramMemory = {};
					}

					// Update all the connected output gates
					if (binaryOut.length == 8) for (let i = 1; i < 9; i++) this.runConnections(binaryOut[8 - i], i);
					this.inputOn = clock;
				}

				// Clear the helper UIs children ready for replacement
				while (this.infoBox.children[1].children.length > 0) this.infoBox.children[1].removeChild(this.infoBox.children[1].children[0]);
				
				// Update helper UI
				for (const itemKey in this.ramMemory) {

					let binaryNumInDec = 0;
					let binaryNumInString = "";
					
					for (let i = 0; i < 8; i++) {
						if(this.ramMemory[itemKey][i]) binaryNumInDec += Math.pow(2, 7 - i);
						
						binaryNumInString += this.ramMemory[itemKey][i] == true ? "1" : "0";
					}

					let binaryAddressInDec = 0;
					let binaryAdd = "";

					for (let i = 0; i < 8; i++) {
						if(itemKey.substring(i, i + 1) == "1") binaryAddressInDec += Math.pow(2, 7 - i);
						binaryAdd += itemKey.substring(i, i + 1);
					}

					let infoBoxChild = document.createElement("div");
							
					let itemInfo = document.createElement("button");
					itemInfo.innerText = "Address : " + binaryAddressInDec + " : " + binaryAdd + "\nValue : " + binaryNumInDec + " : " + binaryNumInString;
					itemInfo.classList.add("ramAdressData");

					let deleteButton = document.createElement("button");
					deleteButton.innerText = "Del"
					deleteButton.classList.add("ramRemove");
					deleteButton.id = this.id + "|" + itemKey + "|ramItemDelete";

					deleteButton.addEventListener("click", e => {

						let targetID = e.target.id.split("|");

						let clickedGate = Number(targetID[0]);
						let ramAdressToRemove = targetID[1];

						delete world.gates["gate" + clickedGate].ramMemory[ramAdressToRemove];
						world.gates["gate" + clickedGate].run(true);
					})
					
					infoBoxChild.appendChild(itemInfo);
					infoBoxChild.appendChild(deleteButton);

					this.infoBox.children[1].appendChild(infoBoxChild);
				}

			}
			
		},
		add8BitBinaryNumbers: function(binaryNum1, binaryNum2, carryIn) {

			// Adds together the 2 input binary numbers

			let binaryOut = [];
			for (let i = 0; i < 8; i++) binaryOut.push(false);

			let carry = carryIn;
			for (let i = 0; i < 8; i++) {

				let bit1 = binaryNum1[i];
				let bit2 = binaryNum2[i];

				let xorBit1Bit2 = (bit1 || bit2) && (bit1 != bit2);
				let xorBit1Bit2Carry = (xorBit1Bit2 || carry) && (xorBit1Bit2 != carry);
					
				let sum = (bit1 * 1) + (bit2 * 1) + (carry * 1);

				binaryOut[i] = xorBit1Bit2Carry;
				carry = sum > 1;
			}

			return [binaryOut, carry];
		},
		removeConnection: function(deletedGateID) {

			let connectionsToDelete = [];

			for (let i = 0; i < this.connections.length; i++) {
				if (this.connections[i].gateID == deletedGateID) connectionsToDelete.push(i);
			}
			
			let indexFix = 0;
			while (connectionsToDelete.length > 0) {
				this.connections.splice(connectionsToDelete[0] - indexFix, 1);
				connectionsToDelete.shift()

				indexFix++;
			}

		},
		removeConnectionByID: function(connectionIndex) {
			let connectionID = this.connections[connectionIndex];

			world.gates[connectionID.gateID].inputs[connectionID.inputID] = false;
			world.gates[connectionID.gateID].inputTaken[connectionID.inputID] = false;
			world.gates[connectionID.gateID].run();

			this.connections.splice(connectionIndex, 1);
		},
		deleteGate: function() {

			for (let i = 0; i < this.maxOutputs; i++) {
				this.runConnections(false, i);
			}

			// Open inputs for new gates
			for (let i = 0; i < this.connections.length; i++) {
				let connectionID = this.connections[i];
				world.gates[connectionID.gateID].inputTaken[connectionID.inputID] = false;
			}

			websiteAudio.delete();
			
		},
		toggleGateDescriptions: function(shouldShow) {

			if (shouldShow) {			
				for (let i = 0; i < this.maxInputs; i++) {
					this.inputElements[i].style.opacity = 1;
				}
			} else {
				for (let i = 0; i < this.maxInputs; i++) {
					this.inputElements[i].style.opacity = 0;
				}
			}
		}
	}


	// If gate is loaded then set all the settings within the gate information to mimic the loaded gate
	if (loadedGateInfo != -1) {
		gateObject.type = loadedGateInfo.type;
		gateObject.id = loadedGateInfo.id;
		gateObject.connections = loadedGateInfo.connections;
		gateObject.backConnections = loadedGateInfo.backConnections;
		gateObject.maxInputs = loadedGateInfo.maxInputs;
		gateObject.maxOutputs = loadedGateInfo.maxOutputs;
		gateObject.inputs = loadedGateInfo.inputs;
		gateObject.inputTaken = loadedGateInfo.inputTaken;
		gateObject.output = loadedGateInfo.output;
		gateObject.outputTaken = loadedGateInfo.outputTaken;
		gateObject.toggleOn = loadedGateInfo.toggleOn;
		gateObject.inputOn = loadedGateInfo.inputOn;
		gateObject.ramMemory = loadedGateInfo.ramMemory;
		gateObject.x = loadedGateInfo.x;
		gateObject.y = loadedGateInfo.y;
		gateObject.hasSetupInputsAndOutputs = loadedGateInfo.hasSetupInputsAndOutputs;

		// Update gate position
		gateObject.element.style.left = (loadedGateInfo.x) + "px";
		gateObject.element.style.top = (loadedGateInfo.y) + "px";
	} else {

		gateObject.element.style.left = (scroll.x - gateObject.x) + "px";
		gateObject.element.style.top = (scroll.y - gateObject.y) + "px";

	}

	// Set the default size of a logic gate
	gateObject.element.style.width = "70px";
	gateObject.element.style.minWidth = "70px";
	gateObject.element.style.height = "70px";
	gateObject.element.style.minHeight = "70px";

	// Apply any differences in size, inputs and outputs to specific gates

	if (gateObject.type == "adder") {
		gateObject.maxInputs = 3;
		gateObject.maxOutputs = 2;

		gateObject.outputNames = ["Sum", "Carry"]
	}

	if (gateObject.type == "alu") {
		gateObject.maxInputs = 1 + 8 + 1 + 8 + 1 + 1 + 1 + 7 + 1 + 2;
		gateObject.maxOutputs = 1 + 8 + 1 + 1;

		gateObject.inputNames = ["$Num 1", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Num 2", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Carry", "Carry", "$Modes", "Add", "Sub", "Or", "And", "Nand", "Nor", "Xor", "$Shift", "Right", "Left"];
		gateObject.outputNames = ["$Out", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Carry", "Carry"];
	
		gateObject.element.style.width = "150px";
		gateObject.element.style.minWidth = "150px";
		gateObject.element.style.height = "500px";
		gateObject.element.style.minHeight = "500px";

		// Add a info box
		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		newGate.appendChild(infoBox);

		gateObject.infoBox = infoBox;

		let contents = ["0\n00000000", "+", "0\n00000000", "=", "0\n00000000"];

		for (let i = 0; i < 5; i++) {
			let infoBoxChild = document.createElement("button");
			infoBoxChild.innerText = contents[i];
			infoBox.appendChild(infoBoxChild);
		}
	}

	if (gateObject.type == "ram") {
		gateObject.maxInputs = 1 + 8 + 1 + 8 + 1 + 3 + 1 + 1;
		gateObject.maxOutputs = 1 + 8;

		gateObject.inputNames = ["$Num", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Address", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Mode", "Read", "Write", "Clear", "$Clock", "Clock"];
		gateObject.outputNames = ["$Out", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8"];
	
		gateObject.element.style.width = "200px";
		gateObject.element.style.minWidth = "200px";
		gateObject.element.style.height = "500px";
		gateObject.element.style.minHeight = "500px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		newGate.appendChild(infoBox);

		let ramEditor = document.createElement("div");
		ramEditor.classList.add("ramEditor");

		let ramDataBinary = document.createElement("input");
		ramDataBinary.placeholder = "Binary Value"
		ramDataBinary.value = "";
		ramDataBinary.type = "text";

		let ramAddressBinary = document.createElement("input");
		ramAddressBinary.placeholder = "Binary Address"
		ramAddressBinary.value = "";
		ramAddressBinary.type = "text";

		let ramDataAddButton = document.createElement("button");
		ramDataAddButton.innerText = "Add Data";
		ramDataAddButton.id = world.uniqueGateId + "|ramDataAddButton"

		ramDataAddButton.addEventListener("click", e => {
			let parentGateID = Number(e.target.id.split("|")[0]);
			world.gates["gate" + parentGateID].run(pulse=false, data={ "addData": true });
		})

		ramEditor.appendChild(ramDataBinary);
		ramEditor.appendChild(ramAddressBinary);
		ramEditor.appendChild(ramDataAddButton);

		let ramData = document.createElement("div");
		ramData.classList.add("ramData");
		ramData.id = "ramDataHolder";

		infoBox.appendChild(ramEditor);
		infoBox.appendChild(ramData);

		gateObject.infoBox = infoBox;
	}

	if (gateObject.type == "latch") {
		gateObject.maxInputs = 2;
		gateObject.maxOutputs = 2;

		gateObject.inputNames = ["Data", "Set"]
		gateObject.outputNames = ["Out", "!Out"]
	}

	if (gateObject.type == "8BitLatch") {
		gateObject.maxInputs = 1 + 8 + 1 + 1;
		gateObject.maxOutputs = 1 + 8;

		gateObject.inputNames = ["$Num", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Clock", "Clock"]
		gateObject.outputNames = ["$Out", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8"]
	
		gateObject.element.style.width = "150px";
		gateObject.element.style.minWidth = "150px";
		gateObject.element.style.height = "275px";
		gateObject.element.style.minHeight = "275px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		newGate.appendChild(infoBox);

		gateObject.infoBox = infoBox;

		let infoBoxChild = document.createElement("button");
		infoBoxChild.innerText = "0\n00000000";
		infoBox.appendChild(infoBoxChild);
	}

	if (gateObject.type == "decimal") {
		gateObject.maxInputs = 0;
		gateObject.maxOutputs = 1 + 8;

		gateObject.outputNames = ["$Out", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8"]
	
		gateObject.element.style.width = "150px";
		gateObject.element.style.minWidth = "150px";
		gateObject.element.style.height = "275px";
		gateObject.element.style.minHeight = "275px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		newGate.appendChild(infoBox);

		gateObject.infoBox = infoBox;

		let infoBoxInput = document.createElement("input");
		infoBoxInput.placeholder = "Decimal Num";
		infoBoxInput.value = "0";
		infoBoxInput.id = world.uniqueGateId + "|decimalInput";
		infoBox.appendChild(infoBoxInput);

		infoBoxInput.addEventListener("change", e => {
			let parentGateID = Number(e.target.id.split("|")[0]);
			world.gates["gate" + parentGateID].run(pulse=false, data={ "inputType": "dec" });
		})

		let infoBoxBinInput = document.createElement("input");
		infoBoxBinInput.placeholder = "Binary Num";
		infoBoxBinInput.value = "00000000";
		infoBoxBinInput.id = world.uniqueGateId + "|decimalBinInput";
		infoBox.appendChild(infoBoxBinInput);

		infoBoxBinInput.addEventListener("change", e => {
			let parentGateID = Number(e.target.id.split("|")[0]);
			world.gates["gate" + parentGateID].run(pulse=false, { "inputType": "bin" });
		})
	}

	if (gateObject.type == "keyboard") {

		gateObject.maxInputs = 0;
		gateObject.maxOutputs = 1;

		gateObject.element.style.width = "150px";
		gateObject.element.style.minWidth = "150px";
		gateObject.element.style.height = "150px";
		gateObject.element.style.minHeight = "150px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		newGate.appendChild(infoBox);

		gateObject.infoBox = infoBox;

		let infoBoxKey = document.createElement("select");
		infoBoxKey.id = world.uniqueGateId + "|keyboardKeySelect";

		let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!"£$%^*()_+-={}[]:@;<>?,./¬`'.split('');
		
		for (let i = 0; i < alphabet.length; i++) {
			let optionChild = document.createElement("option");
			optionChild.value = alphabet[i]
			optionChild.innerText = alphabet[i];

			infoBoxKey.appendChild(optionChild);
		}

		infoBoxKey.addEventListener("change", e => {
			let keyboardGateID = "gate" + e.target.id.split("|")[0];
			world.gates[keyboardGateID].ramMemory["char"] = world.gates[keyboardGateID].infoBox.children[0].value;
		})

		if (loadedGateInfo != -1) infoBoxKey.value = gateObject.ramMemory["char"] || "A";

		infoBox.appendChild(infoBoxKey);

	}

	if (gateObject.type == "delay") {

		gateObject.maxInputs = 1;
		gateObject.maxOutputs = 1;

		gateObject.inputNames = ["Pulse"];

		gateObject.element.style.width = "150px";
		gateObject.element.style.minWidth = "150px";
		gateObject.element.style.height = "150px";
		gateObject.element.style.minHeight = "150px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		newGate.appendChild(infoBox);

		gateObject.infoBox = infoBox;

		let infoBoxDelayVal = document.createElement("input");
		infoBoxDelayVal.placeholder = "Delay / ms";
		infoBoxDelayVal.value = 1000;
		infoBoxDelayVal.id = world.uniqueGateId + "|gateDelay";

		infoBoxDelayVal.addEventListener("change", e => {
			let keyboardGateID = "gate" + e.target.id.split("|")[0];
			world.gates[keyboardGateID].ramMemory["delay"] = Number(world.gates[keyboardGateID].infoBox.children[0].value) || 1000;
		})

		if (loadedGateInfo != -1) infoBoxDelayVal.value = gateObject.ramMemory["delay"] || 1000;

		infoBox.appendChild(infoBoxDelayVal);

	}

	if (gateObject.type == "oscillator") {
		gateObject.maxInputs = 0;
		gateObject.maxOutputs = 1;

		gateObject.element.style.width = "150px";
		gateObject.element.style.minWidth = "150px";
		gateObject.element.style.height = "150px";
		gateObject.element.style.minHeight = "150px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		newGate.appendChild(infoBox);

		gateObject.infoBox = infoBox;

		let infoBoxInput = document.createElement("input");
		infoBoxInput.placeholder = "Frequency / Hz";
		infoBoxInput.value = 1;
		infoBoxInput.id = world.uniqueGateId + "|frequencyInput";
		infoBox.appendChild(infoBoxInput);

	}

	if (gateObject.type == "screen") {
		gateObject.maxInputs = 1 + 3 + 1 + 3 + 1 + 1 + 1 + 1;
		gateObject.maxOutputs = 0;

		gateObject.inputNames = ["$X", "Bit 1", "Bit 2", "Bit 3", "$Y", "Bit 1", "Bit 2", "Bit 3", "$Clock", "Clock", "$Clear", "Clear"]
	
		gateObject.element.style.width = "350px";
		gateObject.element.style.minWidth = "350px";
		gateObject.element.style.height = "380px";
		gateObject.element.style.minHeight = "380px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		newGate.appendChild(infoBox);

		gateObject.infoBox = infoBox;

		let gridChild = document.createElement("div");
		gridChild.classList.add("grid")

		for (let y = 0; y < world.screenSize; y++) {
			for (let x = 0; x < world.screenSize; x++) {
				let infoBoxChild = document.createElement("button");
				infoBoxChild.id = x + "|" + y + "|" + world.uniqueGateId + "|screenPixel";

				infoBoxChild.addEventListener("click", e => {
					// Toggle pixel status

					let pixelInfo = e.target.id.split("|");

					let pixelGateID = "gate" + pixelInfo[2];
					let pixelX = Number(pixelInfo[0]);
					let pixelY = Number(pixelInfo[1]);

					let pixelStatus = world.gates[pixelGateID].ramMemory["pixel_" + pixelX + ","+ pixelY];
					pixelStatus = !pixelStatus;
					
					world.gates[pixelGateID].infoBox.children[0].children[pixelX + (pixelY * world.screenSize)].style.background = "rgb(13, 13, 13)";
					if (pixelStatus) world.gates[pixelGateID].infoBox.children[0].children[pixelX + (pixelY * world.screenSize)].style.background = "rgb(255, 255, 255)";
				
					world.gates[pixelGateID].ramMemory["pixel_" + pixelX + ","+ pixelY] = pixelStatus;
				})

				gridChild.appendChild(infoBoxChild);
				
			}
		}

		infoBox.appendChild(gridChild);
	}

	if (gateObject.type == "input") {
		gateObject.maxInputs = 0;
		gateObject.maxOutputs = 1;
	}

	if (gateObject.type == "toggle") {
		gateObject.maxInputs = 1;
		gateObject.maxOutputs = 1;
	}

	if (gateObject.type == "output" || gateObject.type == "not" || gateObject.type == "buffer") {
		gateObject.maxInputs = 1;
		gateObject.maxOutputs = 1;
	}

	// Create the input elements
	for (let i = 0; i < gateObject.maxInputs; i++) {
		let newGateInput = document.createElement("span");
		newGateInput.innerText = gateObject.inputNames[i];
		newGateInput.id = world.uniqueGateId + "|input|" + i;

		if (loadedGateInfo != -1) newGateInput.id = loadedGateInfo.id + "|input|" + i;

		if (gateObject.inputNames[i].substring(0, 1) == "$") {
			newGateInput.classList.add("gateDetails");
			newGateInput.innerText = gateObject.inputNames[i].substring(1, gateObject.inputNames[i].length);
		} else {
			newGateInput.classList.add("input");

			newGateInput.addEventListener("mouseup", e => {
				if (world.mouseWireConnection == -1) return;

				// Connect new gate
				let newConnection = {
					inputID: Number(e.target.id.split("|")[2]),
					outputID: world.mouseWireConnection[1],
					gateID: "gate" + e.target.id.split("|")[0]
				}

				if (world.gates[newConnection.gateID].inputTaken[newConnection.inputID]) return;


				world.gates[world.mouseWireConnection[0]].connections.push(newConnection);
				world.gates[world.mouseWireConnection[0]].run(true);

				// Claim connection
				world.gates[newConnection.gateID].inputTaken[newConnection.inputID] = true;
			})

			newGateInput.addEventListener("touchend", e => {
				if (world.mouseWireConnection == -1) return;

				// Connect new gate
				let newConnection = {
					inputID: Number(e.changedTouches[0].target.id.split("|")[2]),
					outputID: world.mouseWireConnection[1],
					gateID: "gate" + e.changedTouches[0].target.id.split("|")[0]
				}

				if (world.gates[newConnection.gateID].inputTaken[newConnection.inputID]) return;

				world.gates[world.mouseWireConnection[0]].connections.push(newConnection);
				world.gates[world.mouseWireConnection[0]].run(true);

				// Claim connection
				world.gates[newConnection.gateID].inputTaken[newConnection.inputID] = true;
			})

		}

		gateObject.inputElements[i] = newGateInput;

		newGateHolder.appendChild(newGateInput);
	}

	// Create the output elements
	for (let i = 0; i < gateObject.maxOutputs; i++) {
		let newGateOutput = document.createElement("span");
		newGateOutput.innerText = gateObject.outputNames[i];
		newGateOutput.id = world.uniqueGateId + "|output|" + i;

		if (loadedGateInfo != -1) newGateOutput.id = loadedGateInfo.id + "|output|" + i;

		if (gateObject.outputNames[i].substring(0, 1) == "$") {
			newGateOutput.classList.add("gateDetails");
			newGateOutput.innerText = gateObject.outputNames[i].substring(1, gateObject.outputNames[i].length);
		} else {
			newGateOutput.classList.add("output");

			newGateOutput.addEventListener("mousedown", e => {
				world.mouseWireConnection = ["gate" + (e.target.id.split("|")[0]), Number((e.target.id.split("|")[2]))];	
			})
	
			newGateOutput.addEventListener("touchstart", e => {
				world.mouseWireConnection = ["gate" + (e.changedTouches[0].target.id.split("|")[0]), Number((e.changedTouches[0].target.id.split("|")[2]))];	
			})
		}

		gateObject.outputElements[i] = newGateOutput;

		newGateHolder.appendChild(newGateOutput);
	}

	// Create the delete button
	let gateDelete = document.createElement("button");
	gateDelete.innerHTML = '<i data-feather="trash-2"></i>'
	gateDelete.id = world.uniqueGateId + "GateDelete";

	if (loadedGateInfo != -1) gateDelete.id = loadedGateInfo.id + "GateDelete";

	// Delete listener
	gateDelete.addEventListener("click", e => {
		if (world.draggedGates != -1 | world.draggedTextbox != -1) return;

		let tempGateID = Number(e.target.id.substring(0, e.target.id.length - 10));
		document.getElementById("logic-gate-holder").removeChild( world.gates["gate" + tempGateID.toString()].element.parentElement );
		
		world.gates["gate" + tempGateID.toString()].deleteGate();

		for (const gateKey in world.gates) {
			world.gates[gateKey].removeConnection("gate" + tempGateID.toString());
		}

		delete world.gates["gate" + tempGateID.toString()];
	})

	// Show information
	newGate.addEventListener("contextmenu", e => {
		let targetGate = e.target.id;

		if (targetGate in world.gates) {
			world.gates[targetGate].deleteButton.style.opacity = 1;
			world.gates[targetGate].deleteButton.style["pointer-events"] = "all";
		}
	})

	document.getElementById("background-canvas").addEventListener("mousedown", e => {

		for (const item in world.gates) {
			world.gates[item].deleteButton.style.opacity = 0;
			world.gates[item].deleteButton.style["pointer-events"] = "none";
		}

	})

	gateObject.deleteButton = gateDelete;
	newGateHolder.appendChild(gateDelete)

	if (gateObject.type == "alu" || gateObject.type == "8BitLatch" || gateObject.type == "decimal" || gateObject.type == "oscillator" || gateObject.type == "keyboard" || gateObject.type == "delay") {
		gateObject.deleteButton.style.width = "150px";
		gateObject.deleteButton.style.minWidth = "150px";
	}

	if (gateObject.type == "ram") {
		gateObject.deleteButton.style.width = "200px";
		gateObject.deleteButton.style.minWidth = "200px";
	}

	if (gateObject.type == "screen") {
		gateObject.deleteButton.style.width = "350px";
		gateObject.deleteButton.style.minWidth = "350px";
	}

	let gateNum = world.uniqueGateId;
	if (loadedGateInfo != -1) gateNum = loadedGateInfo.id;

	world.gates["gate" + gateNum] = gateObject;
	world.uniqueGateId += 1;

	feather.replace();

	// Computer controls
	newGate.addEventListener("mousedown", e => {
		if (e.button == 0 && world.draggedGates == -1 && e.target.id.substring(0, 4) == "gate") {
			world.draggedGates = e.target.id
			world.mouseMovedDuringDrag = false;
			websiteAudio.pickup();

			// Send gate to front
			//e.target.style.zIndex = "50";
		}
	});

	window.addEventListener("mousemove", e => {
		if (world.draggedGates == -1) return;

		updateGateLocation(world.draggedGates, {
			x: -( e.pageX * (100 / scroll.zoom) ) + scroll.x + 30,
			y: -( e.pageY * (100 / scroll.zoom) ) + scroll.y + 30
		});

		drawWiresToScreen();
	});
	
	window.addEventListener("mouseup", e => {
		if (world.draggedGates == -1) return;

		checkToToggleInput(world.draggedGates, e);
		world.draggedGates = -1;

		drawWiresToScreen();
	});


	// Mobile controls
	newGate.addEventListener("touchstart", e => {
		world.draggedGates = e.target.id
		world.mouseMovedDuringDrag = false;
		websiteAudio.pickup();

		// Send gate to front
		//e.touches[0].target.style.zIndex = "50";
	});

	window.addEventListener("touchmove", e => {
		if (world.draggedGates == -1) return;

		updateGateLocation(world.draggedGates, {
			x: -( e.touches[0].pageX * (100 / scroll.zoom) ) + scroll.x,
			y: -( e.touches[0].pageY * (100 / scroll.zoom) ) + scroll.y
		});

		drawWiresToScreen();
	});

	window.addEventListener("touchend", e => {
		if (world.draggedGates == -1) return;

		checkToToggleInput(world.draggedGates, e.changedTouches[0]);
		world.draggedGates = -1;

		drawWiresToScreen();
	});

	// Play gate create sound
	websiteAudio.create();

}

function updateGateLocation(gateID, newPosition) {

	let gatePositionX = scroll.x - newPosition.x;
	let gatePositionY = scroll.y - newPosition.y;

	world.gates[gateID].element.style.left = (gatePositionX) + "px";
	world.gates[gateID].element.style.top = (gatePositionY) + "px";

	// Check if object has been dragged
	if (world.gates[gateID].x != newPosition.x || world.gates[gateID].y != newPosition.y) world.mouseMovedDuringDrag = true;

	// Update the recorded position of the gate
	world.gates[gateID].x = newPosition.x;
	world.gates[gateID].y = newPosition.y;

	const gateWidth = Number(world.gates[gateID].element.style.width.split("px")[0]);
	const gateHeight = Number(world.gates[gateID].element.style.height.split("px")[0]);

	// Move the input elements
	for (let i = 0; i < world.gates[gateID].maxInputs; i++) {
		const centeringConst = (world.gates[gateID].maxInputs / 2) * -25 + (gateHeight / 2);

		world.gates[gateID].inputElements[i].style.left = (gatePositionX - 45) + "px";
		world.gates[gateID].inputElements[i].style.top = (gatePositionY + (25 * i) + centeringConst) + "px";
	}

	// Move the output elements
	for (let i = 0; i < world.gates[gateID].maxOutputs; i++) {
		const centeringConst = (world.gates[gateID].maxOutputs / 2) * -25 + (gateHeight / 2);

		world.gates[gateID].outputElements[i].style.left = (gatePositionX + gateWidth + 5) + "px";
		world.gates[gateID].outputElements[i].style.top = (gatePositionY+ (25 * i) + centeringConst) + "px";
	}

	world.gates[gateID].deleteButton.style.left = (gatePositionX - 8) + "px";
	world.gates[gateID].deleteButton.style.top = (gatePositionY + 5 + gateHeight) + "px";
}

function checkToToggleInput(draggedGateID, e) {

	gateName = draggedGateID
	world.gates[gateName].element.style.zIndex = "0";

	if (!world.mouseMovedDuringDrag) {
		if (world.gates[gateName].type == "input") {

			// Toggle the input
			world.gates[gateName].run();
			
			// Set the input background colour
			world.gates[gateName].element.style.background = "rgb(130, 160, 250)";
			if (!world.gates[gateName].output[0]) world.gates[gateName].element.style.background = "var(--whiteColour)";

			websiteAudio.switch();
		}
	}
	else {
		websiteAudio.drop();
	}
}

// Check if mouse is over a wire
window.addEventListener("mousemove", e => {
	checkForWireInteraction(e);
})

window.addEventListener("touchmove", e => {
	checkForWireInteraction(e.changedTouches[0]);
})

function checkForWireInteraction(e) {
	world.focusedWired = -1;
	
	for (const item in world.gates) {
		for (let i = 0; i < world.gates[item].connections.length; i++) {
			if (isPointOnWire(world.gates[item].connections[i], item, { "x": e.pageX, "y": e.pageY })) {
				world.focusedWired = [world.gates[item].connections[i], i, item];
			}
		}
	}
}

window.addEventListener("mousedown", e => {
	if (world.focusedWired == -1) return;

	if (e.button != 1) return;

	// Delete wire
	world.gates[world.focusedWired[2]].removeConnectionByID(world.focusedWired[1]);
	checkForWireInteraction(e);
})

window.addEventListener("touchstart", e => {
	if (world.focusedWired == -1) return;

	// Delete wire
	world.gates[world.focusedWired[2]].removeConnectionByID(world.focusedWired[1]);
	checkForWireInteraction(e.touches[0]);
})

function isPointOnWire(connection, gateKey, point) {

	let inputID = connection.inputID;
	let gateID = connection.gateID;
	let outputID = connection.outputID;

	let outputLeft = world.gates[gateKey].outputElements[outputID].style.left
	let outputTop = world.gates[gateKey].outputElements[outputID].style.top

	let startPos = {
		x: Number(outputLeft.substring(0, outputLeft.length - 2)),
		y: Number(outputTop.substring(0, outputTop.length - 2))
	}

	let inputLeft = world.gates[gateID].inputElements[inputID].style.left
	let inputTop = world.gates[gateID].inputElements[inputID].style.top

	let endPos = {
		x: Number(inputLeft.substring(0, inputLeft.length - 2)),
		y: Number(inputTop.substring(0, inputTop.length - 2))
	}

	const distanceThreshold = 10 * (scroll.zoom / 100);

	const x1 = startPos.x;
	const y1 = startPos.y;

	const x2 = endPos.x;
	const y2 = endPos.y;

	const px = point.x;
	const py = point.y;

	// Calculate the square of the the line length
	const lineLengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;

	// If the line length is zero (i.e., start and end points are the same), compare with the distance to that single point
	if (lineLengthSquared === 0) {
	  const distToStart = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
	  return distToStart <= distanceThreshold;
	}

	let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSquared;

	// Clamp t to the range [0, 1] to ensure the projection lies within the line segment
	t = Math.max(0, Math.min(1, t));

	// Find the projection point on the line segment
	const projectionX = x1 + t * (x2 - x1);
	const projectionY = y1 + t * (y2 - y1);

	// Calculate the distance from point `P` to the projection
	const distanceToLine = Math.sqrt((px - projectionX) ** 2 + (py - projectionY) ** 2);

	// Check if the distance is less than or equal to the threshold
	return distanceToLine <= distanceThreshold;
}

// Canvas and wires

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", e => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	drawWiresToScreen();
})

let lineWidth = 4;
let strokeColour = '#82A0FA';
let activeColour = "#dd4859";
let wirePower = 10;

let backingColour = "#FFFFFF";

function drawWiresToScreen() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawGridToBackground();

	for (const gateKey in world.gates) {

		for (let i = 0; i < world.gates[gateKey].connections.length; i++) {

			let connection = world.gates[gateKey].connections[i];
			let inputID = connection.inputID;
			let gateID = connection.gateID;
			let outputID = connection.outputID;

			let outputLeft = world.gates[gateKey].outputElements[outputID].style.left
			let outputTop = world.gates[gateKey].outputElements[outputID].style.top

			let startPos = {
				x: Number(outputLeft.substring(0, outputLeft.length - 2)),
				y: Number(outputTop.substring(0, outputTop.length - 2))
			}

			let inputLeft = world.gates[gateID].inputElements[inputID].style.left
			let inputTop = world.gates[gateID].inputElements[inputID].style.top

			let endPos = {
				x: Number(inputLeft.substring(0, inputLeft.length - 2)),
				y: Number(inputTop.substring(0, inputTop.length - 2))
			}

			// Check if wire is focused
			let isFocused = false;
			if (world.focusedWired[0] == world.gates[gateKey].connections[i]) isFocused = true;

			drawWire(startPos, endPos, world.gates[gateKey].output[outputID], isFocused);

		}
	}
}

function drawMouseDragWire(e, gateName, selectedOutput) {

	let outputLeft = world.gates[gateName].outputElements[selectedOutput].style.left
	let outputTop = world.gates[gateName].outputElements[selectedOutput].style.top

	let startPos = {
		x: Number(outputLeft.substring(0, outputLeft.length - 2)),
		y: Number(outputTop.substring(0, outputTop.length - 2))
	}
	
	let endPos = {
		x: e.pageX - 5,
		y: e.pageY - 5
	}

	drawWire(startPos, endPos, false);
}

function drawWire(obj1, obj2, isActive, isFocused=false) {
		
	ctx.lineCap = 'round';
	ctx.lineWidth = lineWidth * (scroll.zoom / 100);
	ctx.strokeStyle = strokeColour;

	if (isActive) ctx.strokeStyle = activeColour;
	if (isFocused) ctx.strokeStyle = "#13ff13";

	ctx.beginPath();
  	ctx.moveTo(obj1.x, obj1.y);
	ctx.lineTo(obj2.x, obj2.y);
  	ctx.stroke();
}

function drawGridToBackground() {

	let squareColour = "#FFFFFF07";

	squareColour = "#FFFFFF07";
	if (mode == "light") squareColour = "#00000011";

	ctx.lineCap = 'round';
	ctx.lineWidth = 2;
	ctx.strokeStyle = squareColour;

	let squareSize = 25 * (scroll.zoom / 100);

	ctx.beginPath();
	
	for (let x = (scroll.x * (scroll.zoom / 100) % squareSize); x < canvas.width; x += squareSize) {

		for (let z = (scroll.y * (scroll.zoom / 100) % squareSize); z < canvas.height; z += squareSize) {			
  			ctx.moveTo(0, z);
			ctx.lineTo(canvas.width, z);
		}
		
  		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
	}

	ctx.stroke();

	//if (scroll.x > squareSize || scroll.x < -squareSize) scroll.x = 0;
	//if (scroll.y > squareSize || scroll.y < -squareSize) scroll.y = 0;
}

// Connection wire animation

window.addEventListener("mousemove", e => {
	drawWiresToScreen();

	if (world.mouseWireConnection != -1) {
		drawMouseDragWire(e, world.mouseWireConnection[0], world.mouseWireConnection[1]);

		document.body.style.cursor = "grabbing";
		canvas.style.cursor = "grabbing";
	}
	else {
		document.body.style.cursor = "default";
		canvas.style.cursor = "default";
	}
})

window.addEventListener("touchmove", e => {
	drawWiresToScreen();

	if (world.mouseWireConnection != -1) drawMouseDragWire(e.touches[0], world.mouseWireConnection[0], world.mouseWireConnection[1]);
})

window.addEventListener("mouseup", e => {
	world.mouseWireConnection = -1;
	drawWiresToScreen();
})

// WEBSITE COLOUR SCHEME ==================

let mode = "light";
updateMode();

document.getElementById("mode-toggle").addEventListener("click", e => {
	updateMode();
})

function updateMode() {
	if (mode == "dark") {
		mode = "light";

		document.body.style.setProperty("--whiteColour", "rgb(250, 250, 250)");
		document.body.style.setProperty("--lightGreyColour", "rgb(240, 240, 240)");
		document.body.style.setProperty("--blackColour", "rgb(13, 13, 13)");
		document.body.style.setProperty("--imageFilter", "0%");
		document.body.style.setProperty("--buttonColour", "rgba(0, 0, 0, 0.4)");

		document.getElementById("mode-toggle").innerHTML = '<i data-feather="sun"></i>';

		backingColour = "#FFFFFF";
	}
	else {
		mode = "dark";

		document.body.style.setProperty("--whiteColour", "rgb(20, 20, 25)");
		document.body.style.setProperty("--lightGreyColour", "rgb(15, 15, 20)");
		document.body.style.setProperty("--blackColour", "rgb(255, 255, 255)");
		document.body.style.setProperty("--imageFilter", "100%");
		document.body.style.setProperty("--buttonColour", "rgba(255, 255, 255, 0.1)");

		document.getElementById("mode-toggle").innerHTML = '<i data-feather="moon"></i>';

		backingColour = "#1b1b1b";
	}

	feather.replace();

	drawWiresToScreen();
}

// TEXT BOX CONTROLS ===============

window.addEventListener("contextmenu", e => {
	e.preventDefault();
})

canvas.addEventListener("mousedown", e => {
	addTextBox(e.button, e);
})

canvas.addEventListener("touchend", e => {
	if (!scroll.hasBeenDragged) {
		if (confirm("Would you like to create a text box?")) {
			addTextBox(2, e.changedTouches[0]);
		}
	}
	else {
		scroll.hasBeenDragged = false;
	}
})

function addTextBox(buttonEntered, e, textboxText="Click to edit") {
	if (world.draggedGates == -1 && buttonEntered == 2) {

		// Add textbox
		let textBox = document.createElement("div");
		textBox.classList.add("textBox");

		// Create the drag panel
		let textBoxDrag = document.createElement("span");
		textBoxDrag.innerHTML = '<i data-feather="move"></i>';
		textBoxDrag.id = world.uniqueTexboxID + "text";

		// Create the input text
		let textBoxHolder = document.createElement("h2");
		textBoxHolder.innerText = textboxText;
		textBoxHolder.contentEditable = true;
		textBoxHolder.id = world.uniqueTexboxID + "textbox";

		textBoxHolder.addEventListener("input", e => {
			let targetTextbox = e.target.id.substring(0, e.target.id.length - 7);
			world.textBoxes["texbox" + targetTextbox].text = e.target.innerText;
		})

		// Create the delete button
		let texBoxDelete = document.createElement("button");
		texBoxDelete.innerHTML = '<i data-feather="trash-2"></i>'
		texBoxDelete.id = world.uniqueTexboxID + "textDelete";

		// Delete listener
		texBoxDelete.addEventListener("click", e => {
			if (world.draggedTextbox != -1) return;

			let tempTexboxId = Number(e.target.id.substring(0, e.target.id.length - 10));

			document.getElementById("logic-gate-holder").removeChild( world.textBoxes["texbox" + tempTexboxId.toString()].element );
			delete world.textBoxes["texbox" + tempTexboxId.toString()];

			websiteAudio.delete();
		})
		
		// Position textbox in world
		textBox.style.left = e.pageX + "px";
		textBox.style.top = e.pageY + "px";

		if (e["global"]) {
			textBox.style.left = (scroll.x - e.pageX) + "px";
			textBox.style.top = (scroll.y - e.pageY) + "px";
		}

		textBox.appendChild(textBoxDrag);
		textBox.appendChild(textBoxHolder);
		textBox.appendChild(texBoxDelete);
		
		document.getElementById("logic-gate-holder").appendChild(textBox);

		feather.replace()
		
		// Play text added sound
		websiteAudio.addText();

		let textBoxObject = {
			element: textBox,
			text: textBoxHolder.innerText,
			x: -e.pageX + scroll.x + 15,
			y: -e.pageY + scroll.y + 15
		}

		if (e["global"]) {
			textBoxObject.x = e.pageX;
			textBoxObject.y = e.pageY;
		}

		// Store the texbox in the world object
		world.textBoxes["texbox" + world.uniqueTexboxID.toString()] = textBoxObject;
		world.uniqueTexboxID += 1
		
		// Computer drag controls
		textBoxDrag.addEventListener("mousedown", e => {
			world.draggedTextbox = Number(e.target.id.substring(0, e.target.id.length - 4))
			websiteAudio.pickup();
		})

		window.addEventListener("mousemove", e => {
			if (world.draggedTextbox == -1) return;

			let newXPos = -e.pageX + scroll.x + 15;
			let newYPos = -e.pageY + scroll.y + 15;

			let textItem = world.textBoxes["texbox" + world.draggedTextbox.toString()]
			textItem.element.style.left = (scroll.x - newXPos) + "px";
			textItem.element.style.top = (scroll.y - newYPos) + "px";

			world.textBoxes["texbox" + world.draggedTextbox.toString()].x = newXPos;
			world.textBoxes["texbox" + world.draggedTextbox.toString()].y = newYPos;
		})

		window.addEventListener("mouseup", e => {		
			if (world.draggedTextbox == -1) return;
			websiteAudio.drop();
			world.draggedTextbox = -1;
		})

		// Mobile drag controls
		textBoxDrag.addEventListener("touchstart", e => {
			world.draggedTextbox = Number(e.target.id.substring(0, e.touches[0].target.id.length - 4));
			websiteAudio.pickup();
		})

		window.addEventListener("touchmove", e => {
			if (world.draggedTextbox == -1) return;

			let newXPos = -e.changedTouches[0].pageX + scroll.x + 10;
			let newYPos = -e.changedTouches[0].pageY + scroll.y + 10;

			let textItem = world.textBoxes["texbox" + world.draggedTextbox.toString()]
			textItem.element.style.left = (scroll.x - newXPos) + "px";
			textItem.element.style.top = (scroll.y - newYPos) + "px";

			world.textBoxes["texbox" + world.draggedTextbox.toString()].x = newXPos;
			world.textBoxes["texbox" + world.draggedTextbox.toString()].y = newYPos;
		})

		window.addEventListener("touchend", e => {
			if (world.draggedTextbox == -1) return;
			websiteAudio.drop();
			world.draggedTextbox = -1;
		})
	}
}

// Undo when ctrl+z is pressed
/*window.addEventListener("keydown", e => {
	if (e.key.toUpperCase() == "Z" && e.ctrlKey) {

		e.preventDefault();

		// Undo last action
	}
})*/

// Move the camera when user drags

canvas.addEventListener("mousedown", e => {
	scroll.lastX = e.pageX;
	scroll.lastY = e.pageY;

	scroll.dragging = true;
})

canvas.addEventListener("mousemove", e => {
	if (!scroll.dragging) return;
	moveEditorByDragging(e);
	canvas.style.cursor = "grabbing";
})

window.addEventListener("mouseup", e => {
	scroll.dragging = false;
	canvas.style.cursor = "default";
})

canvas.addEventListener("touchstart", e => {
	scroll.lastX = e.touches[0].pageX;
	scroll.lastY = e.touches[0].pageY;
})

canvas.addEventListener("touchmove", e => {
	moveEditorByDragging(e.touches[0]);
})

function moveEditorByDragging(e) {
	scroll.changeX = e.pageX - scroll.lastX;
	scroll.changeY = e.pageY - scroll.lastY;

	scroll.lastX = e.pageX;
	scroll.lastY = e.pageY;

	// Random constant to stop slow movement
	scroll.x += scroll.changeX * 1.006 * (100 / scroll.zoom);
	scroll.y += scroll.changeY * 1.006 * (100 / scroll.zoom);

	updateScreenPosition();
}

function updateScreenPosition() {

	// Update the position of all the logic gates
	for (const gateKey in world.gates) {

		let item = world.gates[gateKey];

		updateGateLocation(gateKey, {
			x: item.x,
			y: item.y
		});
	}


	// Update the position of all the textboxes
	for (const textboxKey in world.textBoxes) {
		let item = world.textBoxes[textboxKey];

		let newXLocation = scroll.x - item.x;
		let newYLocation = scroll.y - item.y;

		item.element.style.left = newXLocation + "px";	
		item.element.style.top = newYLocation + "px";
	}

	scroll.hasBeenDragged = true;

	drawWiresToScreen();
}

// Update zoom controls
document.getElementById("zoom-in").addEventListener("click", e => {
	changeWorldZoom(scroll.zoom + 10);
})

document.getElementById("zoom-out").addEventListener("click", e => {
	changeWorldZoom(scroll.zoom - 10);
})

document.getElementById("zoomText").addEventListener("input", e => {
	changeWorldZoom(Number(document.getElementById("zoomText").value));
})

document.addEventListener("scroll", e => {
	changeWorldZoom(e.scroll);
})

function changeWorldZoom(newZoom) {

	scroll.zoom = Math.max(10, newZoom);
	document.getElementById("zoomText").value = scroll.zoom;

	document.getElementById("logic-gate-holder").style.transform = "scale(" + (scroll.zoom / 100) + ")";
}

// Update center controls
document.getElementById("center-screen").addEventListener("click", e => {
	
	let averageX = 0;
	let averageY = 0;
	let total = 0;

	for (const itemKey in world.gates) {
		averageX += world.gates[itemKey].x;
		averageY += world.gates[itemKey].y;
		total += 1;
	}

	if (total <= 0) {
		scroll.x = 0;
		scroll.y = 0;
		return;
	}

	averageX = averageX / total;
	averageY = averageY / total;

	scroll.x = averageX + (window.innerWidth / 2);
	scroll.y = averageY + (window.innerHeight / 2);

	updateScreenPosition();
})

// Before unload ask user

window.addEventListener("beforeunload", e => {
	e.returnValue = true;
});

// Update clocks
function updateAllClocks() {

	for (let item in world.gates) {

		if (world.gates[item].type == "oscillator") {
			//websiteAudio.switch();

			world.gates[item].run()
			
			//world.gates[item].element.style.background = "rgba(227,140,225,1)";
			//if (!world.gates[item].output[0]) world.gates[item].element.style.background = "var(--whiteColour)";
		}
		
	}

	drawWiresToScreen();
}

let clockInterval = setInterval(updateAllClocks, 1000 / world.maxTickRate);

// Load gates

let urlParams = new URLSearchParams(window.location.search);
let gateCode = urlParams.get('code');
let textBoxCode = urlParams.get('textBox');

// Create a save file

document.getElementById("save-drogic").addEventListener("click", e => {
	
	let filteredGates = {}

	for (const itemKey in world.gates) {
		let filteredGateObj = {
			type: world.gates[itemKey].type,
			id: world.gates[itemKey].id,
			connections: world.gates[itemKey].connections,
			backConnections: world.gates[itemKey].backConnections,
			maxInputs: world.gates[itemKey].maxInputs,
			maxOutputs: world.gates[itemKey].maxOutputs,
			inputs: world.gates[itemKey].inputs,
			inputTaken: world.gates[itemKey].inputTaken,
			output: world.gates[itemKey].output,
			outputTaken: world.gates[itemKey].outputTaken,
			toggleOn: world.gates[itemKey].toggleOn,
			inputOn: world.gates[itemKey].inputOn,
			ramMemory: world.gates[itemKey].ramMemory,
			x: world.gates[itemKey].x,
			y: world.gates[itemKey].y,
			hasSetupInputsAndOutputs: world.gates[itemKey].hasSetupInputsAndOutputs
		}

		filteredGates[itemKey] = filteredGateObj
	}

	// Create the save object
	let saveObject = {
		textBoxes: world.textBoxes,
		draggedTextbox: -1,
		uniqueTexboxID: world.uniqueTexboxID,
		gates: filteredGates,
		draggedGates: -1,
		uniqueGateId: world.uniqueGateId,
		mouseWireConnection: -1,
		focusedWired: -1,
		undoList: []
	}
	
	
	let megaJSONSaveObject = JSON.stringify(saveObject);
	download(megaJSONSaveObject, "drogicSaveData", "txt");
})

// Function to download data to a file
function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

// Load a save file

document.getElementById("loadFileInput").addEventListener("change", e => {
	if (!confirm("Loading this file will clear your current workspace, are you sure you want to continue?")) return;

	let loadedFile = document.getElementById("loadFileInput").files[0];

	if (loadedFile) {
		let reader = new FileReader();
		reader.readAsText(loadedFile, "UTF-8");

		reader.onload = function (evt) {
			loadSaveData(evt.target.result);
		}

		reader.onerror = function (evt) {
			alert("Error reading file");
		}
	}
})

function loadSaveData(savedJSON) {

	let tempWorld = JSON.parse(savedJSON);

	// Remove all gates and texboxes
	for (const itemKey in world.textBoxes) {
		document.body.removeChild( world.textBoxes[itemKey].element );
	}

	for (const itemKey in world.gates) {
		document.getElementById("logic-gate-holder").removeChild( world.gates[itemKey].element.parentElement );
	}

	// Clear world
	world = {
		textBoxes: {},
		draggedTextbox: -1,
		uniqueTexboxID: 0,
		gates: {},
		draggedGates: -1,
		uniqueGateId: 0,
		mouseWireConnection: -1,
		focusedWired: -1,
		undoList: [],
		maxTickRate: 60,
		screenSize: 8
	}

	for (const itemKey in tempWorld.textBoxes) {
		addTextBox(2, { pageX: tempWorld.textBoxes[itemKey].x, pageY: tempWorld.textBoxes[itemKey].y, global: true }, tempWorld.textBoxes[itemKey].text);
	}

	for (const itemKey in tempWorld.gates) {
		addGate({ pageX: tempWorld.gates[itemKey].x, pageY: tempWorld.gates[itemKey].y}, tempWorld.gates[itemKey]);
	}

	// Load world
	world.draggedTextbox = -1;
	world.uniqueTexboxID = tempWorld.uniqueTexboxID;
	world.draggedGates = -1;
	world.uniqueGateId = tempWorld.uniqueGateId;
	world.mouseWireConnection = -1;
	world.focusedWired = -1;
	world.undoList = tempWorld.undoList;

	// Pulse gates
	for (const itemKey in world.gates) {
		world.gates[itemKey].run(true);
	}

}

/*

	type: gateSelect.value,
	id: world.uniqueGateId,
	element: newGate,
	connections: [],
	backConnections: [],
	maxInputs: 2,
	maxOutputs: 1,
	inputs: [],
	inputNames: ["Bit 1", "Bit 2", "Carry"],
	inputTaken: [],
	inputElements: [],
	output: [],
	outputNames: ["Out", "Carry"],
	outputTaken: [],
	outputElements: [],
	deleteButton: null,
	toggleOn: false,
	inputOn: false,
	ramMemory: {},
	x: 10,
	y: 100,
	hasSetupInputsAndOutputs: false,

*/
