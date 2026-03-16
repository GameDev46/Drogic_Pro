class LogicGate {

    static MOUSE_WIRE_CONNECTION;
    static DRAGGED_GATE;
    static DRAGGED_TEXTBOX;

    static MOUSE_MOVED_DURING_DRAG = false;

    static KEYBOARD = {};

    static GATES = {};
    static GATE_ID = 0;

    type;   // The gate's type (used for saving)

    x = 0;  // The gate's global X position
	y = 0;  // The gate's global Y position

    inputs = [];							    // The state of each input (true or false)
    inputNames = ["Bit 1", "Bit 2", "Carry"];	// The name of each input
    inputTaken = [];						    // Whether the input is already in use
    inputElements = [];							// The workspace element for each input
    
    output = [];							    // The state of each output (true or false)
    outputNames = ["Out", "Carry"];				// The name of each output
    outputTaken = [];							// Whether the output is already in use
    outputElements = [];			            // The workspace element for each output

    maxInputs = 2;              // The number of input bits the gate has
    maxOutputs = 1;             // The number of output bits the gate has
    forwardConnections = [];    // A list of the gate's the gate os connected to
    backConnections = [];       // A list of the gate's which are connected to this gate

    deleteButton;   // The HTML element of the button used to delete the gate

    // Sound effects
    createAudio = new Audio("./sounds/connect.wav")
    pickupAudio = new Audio("./sounds/drop2.wav");
    deleteAudio = new Audio("./sounds/connect.wav");

    // Need to move these into each child class where they are used, main class does not need them!!!
    toggledOn = false;
    inputOn = false;

    memory = {};

    gateHTMLElement;    // The gate's correspoding HTML element

    // A pulse is sent whenever a gate is created to properly setup each gate before it can be used
    pulse;

    gateId; // The unique ID of the gate

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {        
        this.type = gateType;
        
        this.gateHTMLElement = gateHTMLElement;
        this.gateId = gateId;

        this.x = -10 + position.x;
	    this.y = -100 + position.y;

        this.gateHTMLElement.style.left = (position.x - this.x) + "px";
        this.gateHTMLElement.style.top = (position.y - this.y) + "px";

        // Set the default size of a logic gate
        this.gateHTMLElement.style.width = "70px";
        this.gateHTMLElement.style.minWidth = "70px";
        this.gateHTMLElement.style.height = "70px";
        this.gateHTMLElement.style.minHeight = "70px";

        if (setupData != null) {
            this.gateId = setupData.id;
            this.forwardConnections = setupData.connections;
            this.backConnections = setupData.backConnections;
            this.maxInputs = setupData.maxInputs;
            this.maxOutputs = setupData.maxOutputs;
            this.inputs = setupData.inputs;
            this.inputTaken = setupData.inputTaken;
            this.output = setupData.output;
            this.outputTaken = setupData.outputTaken;
            this.toggleOn = setupData.toggleOn;
            this.inputOn = setupData.inputOn;
            this.memory = setupData.ramMemory;
            this.x = setupData.x;
            this.y = setupData.y;
            // Update gate position
            this.gateHTMLElement.style.left = setupData.x + "px";
            this.gateHTMLElement.style.top = setupData.y + "px";
        }

        this.setupIO();

        LogicGate.GATES["gate" + this.gateId] = this;
    }

    static createGate(gateType, position, setupData=null) {
        // Create the gate holder
        let newGateHolder = document.createElement("div");
        newGateHolder.classList.add("logic-gate");
        
        // Create the solid background of the main gate
        let newGateDiv = document.createElement("div");
        newGateDiv.id = "gate" + LogicGate.GATE_ID;
        // Set the gate's id to be that of the loaded gates
        if (setupData) newGateDiv.id = "gate" + setupData.id;

        // Create the gate name element
        let newGateH2 = document.createElement("h2");
        newGateH2.innerText = gateType;

        // Create the gates icon
        let newGateImage = document.createElement("img");
        newGateImage.src = "./images/" + gateType + ".svg";

        newGateImage.alt = gateType + " gate";
        newGateImage.onerror = function() {
            this.style.opacity = 0;
            this.style.height = "27px";
        }

        // Append all the elements to the gate holder
        newGateDiv.appendChild(newGateImage);
        newGateDiv.appendChild(newGateH2);
        newGateHolder.appendChild(newGateDiv)

        // Add the objects to the workspace
        document.getElementById("logic-gate-holder").appendChild(newGateHolder);
        
        // Create and return the new gate
        switch (gateType) {
            case "input":       return new InputGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "output":      return new OutputGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "toggle":      return new ToggleGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "buffer":      return new BasicLogicGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "and":         return new BasicLogicGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "nand":        return new BasicLogicGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "not":         return new BasicLogicGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "or":          return new BasicLogicGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "nor":         return new BasicLogicGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "xor":         return new BasicLogicGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "adder":       return new AdderGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "latch":       return new LatchGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "8BitLatch":   return new ByteLatchGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "decimal":     return new DecimalInputGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "keyboard":    return new KeyboardInputGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "oscillator":  return new OscillatorGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "screen":      return new ScreenGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "alu":         return new ALUGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            case "ram":         return new RAMGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
            default:            return new InputGate(gateType, position, newGateDiv, LogicGate.GATE_ID++, setupData);
        }
    }

    setupGateInteractions() {
        // Computer controls
        this.gateHTMLElement.addEventListener("mousedown", e => {
            if (e.button == 0 && LogicGate.DRAGGED_GATE == null && e.target.id.substring(0, 4) == "gate") {
                LogicGate.DRAGGED_GATE = e.target.id
                LogicGate.MOUSE_MOVED_DURING_DRAG = false;

                this.pickupAudio.currentTime = 0;
                this.pickupAudio.play();
            }
        });

        // Mobile controls
        this.gateHTMLElement.addEventListener("touchstart", e => {
            LogicGate.DRAGGED_GATE = e.target.id
            LogicGate.MOUSE_MOVED_DURING_DRAG = false;
            
            this.pickupAudio.currentTime = 0;
            this.pickupAudio.play();
        });

        // Play gate create sound
        this.createAudio.currentTime = 0;
		this.createAudio.play();
    }

    setupIO() {
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
	}

    setupIOElements() {
        // Create the input elements
        for (let i = 0; i < this.maxInputs; i++) {
            let newGateInput = document.createElement("span");
            newGateInput.innerText = this.inputNames[i];
            newGateInput.id = this.gateId + "|input|" + i;

            if (this.inputNames[i].substring(0, 1) == "$") {
                newGateInput.classList.add("gateDetails");
                newGateInput.innerText = this.inputNames[i].substring(1, this.inputNames[i].length);
            } else {
                newGateInput.classList.add("input");

                newGateInput.addEventListener("mouseup", e => {
                    if (!LogicGate.MOUSE_WIRE_CONNECTION) return;

                    // Connect new gate
                    let newConnection = {
                        inputID: Number(e.target.id.split("|")[2]),
                        outputID: LogicGate.MOUSE_WIRE_CONNECTION[1],
                        gateID: "gate" + e.target.id.split("|")[0]
                    }

                    if (LogicGate.GATES[newConnection.gateID].inputTaken[newConnection.inputID]) return;

                    LogicGate.GATES[LogicGate.MOUSE_WIRE_CONNECTION[0]].forwardConnections.push(newConnection);
                    LogicGate.GATES[LogicGate.MOUSE_WIRE_CONNECTION[0]].run(true);
                    // Claim connection
                    LogicGate.GATES[newConnection.gateID].inputTaken[newConnection.inputID] = true;
                })

                newGateInput.addEventListener("touchend", e => {
                    if (!LogicGate.MOUSE_WIRE_CONNECTION) return;

                    // Connect new gate
                    let newConnection = {
                        inputID: Number(e.changedTouches[0].target.id.split("|")[2]),
                        outputID: LogicGate.MOUSE_WIRE_CONNECTION[1],
                        gateID: "gate" + e.changedTouches[0].target.id.split("|")[0]
                    }

                    if (LogicGate.GATES[newConnection.gateID].inputTaken[newConnection.inputID]) return;

                    LogicGate.GATES[LogicGate.MOUSE_WIRE_CONNECTION[0]].forwardConnections.push(newConnection);
                    LogicGate.GATES[LogicGate.MOUSE_WIRE_CONNECTION[0]].run(true);
                    // Claim connection
                    LogicGate.GATES[newConnection.gateID].inputTaken[newConnection.inputID] = true;
                })

            }

            this.inputElements[i] = newGateInput;
            this.gateHTMLElement.parentElement.appendChild(newGateInput);
        }

        // Create the output elements
        for (let i = 0; i < this.maxOutputs; i++) {
            let newGateOutput = document.createElement("span");
            newGateOutput.innerText = this.outputNames[i];
            newGateOutput.id = this.gateId + "|output|" + i;

            if (this.outputNames[i].substring(0, 1) == "$") {
                newGateOutput.classList.add("gateDetails");
                newGateOutput.innerText = this.outputNames[i].substring(1, this.outputNames[i].length);
            } else {
                newGateOutput.classList.add("output");

                newGateOutput.addEventListener("mousedown", e => {
                    LogicGate.MOUSE_WIRE_CONNECTION = ["gate" + (e.target.id.split("|")[0]), Number((e.target.id.split("|")[2]))];	
                })
        
                newGateOutput.addEventListener("touchstart", e => {
                    LogicGate.MOUSE_WIRE_CONNECTION = ["gate" + (e.changedTouches[0].target.id.split("|")[0]), Number((e.changedTouches[0].target.id.split("|")[2]))];	
                })
            }

            this.outputElements[i] = newGateOutput;
            this.gateHTMLElement.parentElement.appendChild(newGateOutput);
        }

        // Create the delete button
        let gateDelete = document.createElement("button");
        gateDelete.innerHTML = '<i data-feather="trash-2"></i>'
        gateDelete.id = this.gateId + "GateDelete";

        // Delete listener
        gateDelete.addEventListener("click", e => {
            if (LogicGate.DRAGGED_GATE != null || LogicGate.DRAGGED_TEXTBOX != null) return;

            let tempGateID = Number(e.target.id.substring(0, e.target.id.length - 10));
            document.getElementById("logic-gate-holder").removeChild( LogicGate.GATES["gate" + tempGateID.toString()].gateHTMLElement.parentElement );
            
            LogicGate.GATES["gate" + tempGateID.toString()].deleteGate();

            for (const gateKey in LogicGate.GATES) {
                LogicGate.GATES[gateKey].removeConnection("gate" + tempGateID.toString());
            }

            delete LogicGate.GATES["gate" + tempGateID.toString()];
        })

        // Show information
        this.gateHTMLElement.addEventListener("contextmenu", e => {
            let targetGate = e.target.id;

            if (targetGate in LogicGate.GATES) {
                LogicGate.GATES[targetGate].deleteButton.style.opacity = 1;
                LogicGate.GATES[targetGate].deleteButton.style["pointer-events"] = "all";
            }
        })

        document.getElementById("background-canvas").addEventListener("mousedown", e => {

            for (const item in LogicGate.GATES) {
                LogicGate.GATES[item].deleteButton.style.opacity = 0;
                LogicGate.GATES[item].deleteButton.style["pointer-events"] = "none";
            }

        })

        this.deleteButton = gateDelete;
        this.gateHTMLElement.parentElement.appendChild(gateDelete);
    }

    setGatePosition(worldPosition, screenPosition) {
        this.gateHTMLElement.style.left = screenPosition.x + "px";
        this.gateHTMLElement.style.top = screenPosition.y + "px";
    
        // Check if object has been dragged
        if (this.x != worldPosition.x || this.y != worldPosition.y) LogicGate.MOUSE_MOVED_DURING_DRAG = true;
    
        // Update the recorded position of the gate
        this.x = worldPosition.x;
        this.y = worldPosition.y;
    
        const gateWidth = Number(this.gateHTMLElement.style.width.split("px")[0]);
        const gateHeight = Number(this.gateHTMLElement.style.height.split("px")[0]);
    
        // Move the input elements
        for (let i = 0; i < this.maxInputs; i++) {
            const centeringConst = (this.maxInputs / 2) * -25 + (gateHeight / 2);
    
            this.inputElements[i].style.left = (screenPosition.x - 45) + "px";
            this.inputElements[i].style.top = (screenPosition.y + (25 * i) + centeringConst) + "px";
        }
    
        // Move the output elements
        for (let i = 0; i < this.maxOutputs; i++) {
            const centeringConst = (this.maxOutputs / 2) * -25 + (gateHeight / 2);
    
            this.outputElements[i].style.left = (screenPosition.x + gateWidth + 5) + "px";
            this.outputElements[i].style.top = (screenPosition.y + (25 * i) + centeringConst) + "px";
        }
    
        this.deleteButton.style.left = (screenPosition.x - 8) + "px";
        this.deleteButton.style.top = (screenPosition.y + 5 + gateHeight) + "px";
    }

    runConnections(isHigh, isPulse, outputId=0) {
        // Activate or deactivate all the connected gates at a specified output
        if (this.output[outputId] == isHigh && !isPulse) return;
        this.output[outputId] = isHigh;

        // Change output's colour
        this.outputElements[outputId].style.background = "rgb(208, 107, 107)";
        if (isHigh) this.outputElements[outputId].style.background = "rgb(132, 208, 107)";

        // Loop over the forward connections and update each one
        for (var i = 0; i < this.forwardConnections.length; i++) {
            let connectionID = this.forwardConnections[i];

            if (connectionID.outputID != outputId) continue;

            LogicGate.GATES[connectionID.gateID].inputs[connectionID.inputID] = this.output[outputId];
            LogicGate.GATES[connectionID.gateID].run();
        }
    }

    run(isPulse=false, data={}) {
        return;
    }

    removeConnection(deletedGateID) {
        let connectionsToDelete = [];

        for (let i = 0; i < this.forwardConnections.length; i++) {
            if (this.forwardConnections[i].gateID == deletedGateID) connectionsToDelete.push(i);
        }
        
        let indexFix = 0;
        while (connectionsToDelete.length > 0) {
            this.forwardConnections.splice(connectionsToDelete[0] - indexFix, 1);
            connectionsToDelete.shift()

            indexFix++;
        }
    }

    removeConnectionByID(connectionIndex) {
        let connectionID = this.forwardConnections[connectionIndex];

        LogicGate.GATES[connectionID.gateID].inputs[connectionID.inputID] = false;
        LogicGate.GATES[connectionID.gateID].inputTaken[connectionID.inputID] = false;
        LogicGate.GATES[connectionID.gateID].run();

        this.forwardConnections.splice(connectionIndex, 1);
    }

    toggleGateDescriptions(shouldShow) {
        for (let i = 0; i < this.maxInputs; i++) this.inputElements[i].style.opacity = shouldShow ? 1 : 0;
    }

    deleteGate() {
        for (let i = 0; i < this.maxOutputs; i++) this.runConnections(false, false, i);

        // Open inputs for new gates
        for (let i = 0; i < this.forwardConnections.length; i++) {
            let connectionID = this.forwardConnections[i];
            LogicGate.GATES[connectionID.gateID].inputTaken[connectionID.inputID] = false;
        }

		this.deleteAudio.currentTime = 0;
		this.deleteAudio.play();
    }
}

class InputGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 0;
		this.maxOutputs = 1;

        this.setupIOElements();
        this.setupGateInteractions();
    }

    run(isPulse=false, data={}) {
        if (!isPulse) this.inputOn = !this.inputOn;
		this.runConnections(this.inputOn, isPulse);
    }
}

class OutputGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 1;
		this.maxOutputs = 1;

        this.setupIOElements();
        this.setupGateInteractions();
    }

    run(isPulse=false, data={}) {
        let foundOn = false;
        for (var i = 0; i < this.inputs.length; i++) {
            if (this.inputs[i] == true) foundOn = true;
        }

        if (foundOn) {
            this.gateHTMLElement.style.background = "rgba(232,255,125,1)";
            this.gateHTMLElement.style.boxShadow = "0 0 20px rgba(245, 245, 120, 0.7)";
        }
        else {
            this.gateHTMLElement.style.background = "var(--whiteColour)";		
            this.gateHTMLElement.style.boxShadow = "none";
        }

        this.runConnections(foundOn, isPulse);
        return;
    }
}

class ToggleGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 1;
		this.maxOutputs = 1;

        this.setupIOElements();
        this.setupGateInteractions();
    }

    run(isPulse=false, data={}) {
        if (this.inputs[0] && !this.inputOn) this.toggleOn = !this.toggleOn;
        this.inputOn = this.inputs[0];

        if (this.toggleOn) {
            this.gateHTMLElement.style.background = "rgba(255,255,150,1)";
            this.gateHTMLElement.style.boxShadow = "0 0 20px rgba(222, 245, 222, 0.7)";
        }
        else {
            this.gateHTMLElement.style.background = "var(--whiteColour)";		
            this.gateHTMLElement.style.boxShadow = "none";
        }

        this.runConnections(this.toggleOn, isPulse);
    }
}

class BasicLogicGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        if (gateType == "not" || gateType == "buffer") {
            this.maxInputs = 1;
		    this.maxOutputs = 1;
        }

        this.setupIOElements();
        this.setupGateInteractions();
    }

    run(isPulse=false, data={}) {
        if (this.type == "buffer") this.runConnections(this.inputs[0], isPulse);
        if (this.type == "and") this.runConnections(this.inputs[0] && this.inputs[1], isPulse);
        if (this.type == "nand") this.runConnections(!(this.inputs[0] && this.inputs[1]), isPulse);
        if (this.type == "not") this.runConnections(!this.inputs[0], isPulse);
        if (this.type == "or") this.runConnections(this.inputs[0] || this.inputs[1], isPulse);
        if (this.type == "nor") this.runConnections(!this.inputs[0] && !this.inputs[1], isPulse);
        if (this.type == "xor") this.runConnections( (this.inputs[0] || this.inputs[1]) && (this.inputs[0] != this.inputs[1]), isPulse );
    }
}

class AdderGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 3;
		this.maxOutputs = 2;
		this.outputNames = ["Sum", "Carry"]

        this.setupIOElements();
        this.setupGateInteractions();
    }

    run(isPulse=false, data={}) {
        let bit1 = this.inputs[0];
        let bit2 = this.inputs[1];
        let carryIn = this.inputs[2];

        let xorBit1Bit2 = (bit1 || bit2) && (bit1 != bit2)
        let xorBit1Bit2Carry = (xorBit1Bit2 || carryIn) && (xorBit1Bit2 != carryIn)

        let total = (bit1 * 1) + (bit2 * 1) + (carryIn * 1)
        
        // Output the sum
        this.runConnections(xorBit1Bit2Carry, isPulse, 0)

        // Output the carry
        this.runConnections(total > 1, isPulse, 1)
    }
}

class LatchGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 2;
		this.maxOutputs = 2;

		this.inputNames = ["Data", "Set"]
		this.outputNames = ["Out", "!Out"]

        this.setupIOElements();
        this.setupGateInteractions();
    }

    run(isPulse=false, data={}) {
        if (this.inputs[1] && !this.toggleOn) this.inputOn = this.inputs[0];
        this.toggleOn = this.inputs[1];
        
        this.runConnections(this.inputOn, isPulse, 0)
        this.runConnections(!this.inputOn, isPulse, 1)

        if (this.inputOn) {
            this.gateHTMLElement.style.background = "rgba(150,255,150,1)";
            this.gateHTMLElement.style.boxShadow = "0 0 20px rgba(150, 245, 150, 0.7)";
        }
        else {
            this.gateHTMLElement.style.background = "var(--whiteColour)";		
            this.gateHTMLElement.style.boxShadow = "none";
        }
    }
}

class ByteLatchGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 1 + 8 + 1 + 1;
		this.maxOutputs = 1 + 8;

		this.inputNames = ["$Num", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Clock", "Clock"]
		this.outputNames = ["$Out", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8"]
	
		this.gateHTMLElement.style.width = "150px";
		this.gateHTMLElement.style.minWidth = "150px";
		this.gateHTMLElement.style.height = "275px";
		this.gateHTMLElement.style.minHeight = "275px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		this.gateHTMLElement.appendChild(infoBox);

		this.infoBox = infoBox;

		let infoBoxChild = document.createElement("button");
		infoBoxChild.innerText = "0\n00000000";
		infoBox.appendChild(infoBoxChild);

        this.setupIOElements();
        this.setupGateInteractions();

        this.deleteButton.style.width = "150px";
		this.deleteButton.style.minWidth = "150px";
    }

    run(isPulse=false, data={}) {
        if (this.inputs[10] && !this.toggleOn) {
            for (let i = 0; i < 8; i++) {
                this.memory["bit" + i] = this.inputs[i + 1];
                this.runConnections(this.memory["bit" + i], isPulse, i + 1);
            }
        }

        this.toggleOn = this.inputs[10];

        // Update helper UI
        let outBinaryString = "";
        let outBinaryNum = 0;

        for (let i = 0; i < 8; i++) {
            if(this.memory["bit" + i]) {
                outBinaryString = "1" + outBinaryString;
                outBinaryNum += Math.pow(2, i);
            }
            else {
                outBinaryString = "0" + outBinaryString;
            }
        }

        this.infoBox.children[0].innerText = outBinaryNum + "\n" + outBinaryString
    }
}

class DecimalInputGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 0;
		this.maxOutputs = 1 + 8;

		this.outputNames = ["$Out", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8"]
	
		this.gateHTMLElement.style.width = "150px";
		this.gateHTMLElement.style.minWidth = "150px";
		this.gateHTMLElement.style.height = "275px";
		this.gateHTMLElement.style.minHeight = "275px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		this.gateHTMLElement.appendChild(infoBox);

		this.infoBox = infoBox;

		let infoBoxInput = document.createElement("input");
		infoBoxInput.placeholder = "Decimal Num";
		infoBoxInput.value = "0";
		infoBoxInput.id = this.gateId + "|decimalInput";
		infoBox.appendChild(infoBoxInput);

		infoBoxInput.addEventListener("change", e => {
			let parentGateID = Number(e.target.id.split("|")[0]);
			LogicGate.GATES["gate" + parentGateID].run(false, { "inputType": "dec" });
		})

		let infoBoxBinInput = document.createElement("input");
		infoBoxBinInput.placeholder = "Binary Num";
		infoBoxBinInput.value = "00000000";
		infoBoxBinInput.id = this.gateId + "|decimalBinInput";
		infoBox.appendChild(infoBoxBinInput);

		infoBoxBinInput.addEventListener("change", e => {
			let parentGateID = Number(e.target.id.split("|")[0]);
			LogicGate.GATES["gate" + parentGateID].run(false, { "inputType": "bin" });
		})

        this.setupIOElements();
        this.setupGateInteractions();

        this.deleteButton.style.width = "150px";
		this.deleteButton.style.minWidth = "150px";
    }

    run(isPulse=false, data={}) {
        if (isPulse) this.infoBox.children[0].value = this.memory["dec"];

        let decimalVal = 0;
        let binaryString = "0000000";

        if (data["inputType"] == "dec" && !isPulse) {
            let str = this.infoBox.children[0].value;

            if (typeof str != "string") str = "0";
            if (isNaN(str) || isNaN(parseFloat(str))) str = "0";

            this.memory["dec"] = Number(this.infoBox.children[0].value);

            decimalVal = Number(this.infoBox.children[0].value);
            binaryString = Number( Math.min( Number(str), 255 ) ).toString(2).substring(0, 8);

            for (let i = 0; binaryString.length < 8; i++) binaryString = "0" + binaryString;
        }

        if (data["inputType"] == "bin" && !isPulse) {
            let bin = this.infoBox.children[1].value.substring(0, 8);
            
            for (let i = 0; bin.length < 8; i++) bin = "0" + bin;
            for (let i = 0; i < 8; i++) if (bin[i] == "1") decimalVal +=  Math.pow(2, 7 - i);

            this.memory["dec"] = decimalVal;
            binaryString = bin;
        }

        for (let i = 0; i < 8; i++) {
            this.memory["bit" + i] = binaryString[7-i] == "1";
            this.runConnections(this.memory["bit" + i], isPulse, i + 1);
        }

        // Update helper UI
        this.infoBox.children[0].value = decimalVal;
        this.infoBox.children[1].value = binaryString;
    }
}

class KeyboardInputGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 0;
		this.maxOutputs = 1;

		this.gateHTMLElement.style.width = "150px";
		this.gateHTMLElement.style.minWidth = "150px";
		this.gateHTMLElement.style.height = "150px";
		this.gateHTMLElement.style.minHeight = "150px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		this.gateHTMLElement.appendChild(infoBox);

		this.infoBox = infoBox;

		let infoBoxKey = document.createElement("select");
		infoBoxKey.id = this.gateId + "|keyboardKeySelect";

		let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!"£$%^*()_+-={}[]:@;<>?,./¬`'.split('');
		
		for (let i = 0; i < alphabet.length; i++) {
			let optionChild = document.createElement("option");
			optionChild.value = alphabet[i]
			optionChild.innerText = alphabet[i];

			infoBoxKey.appendChild(optionChild);
		}

		infoBoxKey.addEventListener("change", e => {
			let keyboardGateID = "gate" + e.target.id.split("|")[0];
			LogicGate.GATES[keyboardGateID].memory["char"] = LogicGate.GATES[keyboardGateID].infoBox.children[0].value;
		})

		if (setupData) infoBoxKey.value = this.memory["char"] || "A";

		infoBox.appendChild(infoBoxKey);

        this.setupIOElements();
        this.setupGateInteractions();

        this.deleteButton.style.width = "150px";
		this.deleteButton.style.minWidth = "150px";
    }

    run(isPulse=false, data={}) {
        if (!("char" in this.memory)) this.memory["char"] = "A";

        let activeKey = this.memory["char"];
        this.infoBox.children[0].selected = this.memory["char"];

        if (LogicGate.KEYBOARD[activeKey]) {
            this.runConnections(true, isPulse);
        } else {
            this.runConnections(false, isPulse);
        }
    }
}

class DelayGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 1;
		this.maxOutputs = 1;

		this.inputNames = ["Pulse"];

		this.gateHTMLElement.style.width = "150px";
		this.gateHTMLElement.style.minWidth = "150px";
		this.gateHTMLElement.style.height = "150px";
		this.gateHTMLElement.style.minHeight = "150px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		this.gateHTMLElement.appendChild(infoBox);

		this.infoBox = infoBox;

		let infoBoxDelayVal = document.createElement("input");
		infoBoxDelayVal.placeholder = "Delay / ms";
		infoBoxDelayVal.value = 1000;
		infoBoxDelayVal.id = this.gateId + "|gateDelay";

		infoBoxDelayVal.addEventListener("change", e => {
			let keyboardGateID = "gate" + e.target.id.split("|")[0];
			LogicGate.GATES[keyboardGateID].memory["delay"] = Number(LogicGate.GATES[keyboardGateID].infoBox.children[0].value) || 1000;
		})

		if (setupData) infoBoxDelayVal.value = this.memory["delay"] || 1000;

		infoBox.appendChild(infoBoxDelayVal);

        this.setupIOElements();
        this.setupGateInteractions();

        this.deleteButton.style.width = "150px";
		this.deleteButton.style.minWidth = "150px";
    }

    run(isPulse=false, data={}) {
        if (!("delay" in this.memory)) this.memory["delay"] = 1000;

        let gateDelay = this.memory["delay"];
        this.infoBox.children[0].value = this.memory["delay"];

        if (data["delayEnd"]) {
            // Run the delayed inputs
            this.runConnections(data["isHigh"], isPulse);
        } else {
            let delayWait = setTimeout(this.run, this.memory["delay"], [false, {"delayEnd": true, "isHigh": this.inputs[0]}]);
        }
    }
}

class OscillatorGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 0;
		this.maxOutputs = 1;

		this.gateHTMLElement.style.width = "150px";
		this.gateHTMLElement.style.minWidth = "150px";
		this.gateHTMLElement.style.height = "150px";
		this.gateHTMLElement.style.minHeight = "150px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		this.gateHTMLElement.appendChild(infoBox);

		this.infoBox = infoBox;

		let infoBoxInput = document.createElement("input");
		infoBoxInput.placeholder = "Frequency / Hz";
		infoBoxInput.value = 1;
		infoBoxInput.id = this.gateId + "|frequencyInput";
		infoBox.appendChild(infoBoxInput);

        this.setupIOElements();
        this.setupGateInteractions();

        this.deleteButton.style.width = "150px";
		this.deleteButton.style.minWidth = "150px";
    }

    run(isPulse=false, data={}) {
        let str = this.infoBox.children[0].value;

        if (typeof str != "string") str = "1";
        if (isNaN(str) || isNaN(parseFloat(str))) str = "1";

        if (isPulse) this.infoBox.children[0].value = this.memory["freq"];
        if (this.memory["lastFireTime"] == null) this.memory["lastFireTime"] = Date.now() / 1000;

        if (!isPulse) this.memory["freq"] = Number(this.infoBox.children[0].value);

        if (!isPulse) {
            if (this.memory["lastFireTime"] + (1 / this.memory["freq"]) < Date.now() / 1000) {
                this.inputOn = !this.inputOn;
                this.memory["lastFireTime"] = Date.now() / 1000;
            }
        }

        this.runConnections(this.inputOn, isPulse);
    }
}

class ScreenGate extends LogicGate {

    static SCREEN_SIZE = 8;

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 1 + 3 + 1 + 3 + 1 + 1 + 1 + 1;
		this.maxOutputs = 0;

		this.inputNames = ["$X", "Bit 1", "Bit 2", "Bit 3", "$Y", "Bit 1", "Bit 2", "Bit 3", "$Clock", "Clock", "$Clear", "Clear"]
	
		this.gateHTMLElement.style.width = "350px";
		this.gateHTMLElement.style.minWidth = "350px";
		this.gateHTMLElement.style.height = "380px";
		this.gateHTMLElement.style.minHeight = "380px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		this.gateHTMLElement.appendChild(infoBox);

		this.infoBox = infoBox;

		let gridChild = document.createElement("div");
		gridChild.classList.add("grid")

		for (let y = 0; y < ScreenGate.SCREEN_SIZE; y++) {
			for (let x = 0; x < ScreenGate.SCREEN_SIZE; x++) {
				let infoBoxChild = document.createElement("button");
				infoBoxChild.id = x + "|" + y + "|" + this.gateId + "|screenPixel";

				infoBoxChild.addEventListener("click", e => {
					// Toggle pixel status
					let pixelInfo = e.target.id.split("|");

					let pixelGateID = "gate" + pixelInfo[2];
					let pixelX = Number(pixelInfo[0]);
					let pixelY = Number(pixelInfo[1]);

					let pixelStatus = LogicGate.GATES[pixelGateID].memory["pixel_" + pixelX + ","+ pixelY];
					pixelStatus = !pixelStatus;
					
					LogicGate.GATES[pixelGateID].infoBox.children[0].children[pixelX + (pixelY * ScreenGate.SCREEN_SIZE)].style.background = "rgb(13, 13, 13)";
					if (pixelStatus) LogicGate.GATES[pixelGateID].infoBox.children[0].children[pixelX + (pixelY * ScreenGate.SCREEN_SIZE)].style.background = "rgb(255, 255, 255)";
				
					LogicGate.GATES[pixelGateID].memory["pixel_" + pixelX + ","+ pixelY] = pixelStatus;
				})

				gridChild.appendChild(infoBoxChild);
			}
		}

		infoBox.appendChild(gridChild);

        this.setupIOElements();
        this.setupGateInteractions();

        this.deleteButton.style.width = "350px";
		this.deleteButton.style.minWidth = "350px";
    }

    run(isPulse=false, data={}) {
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

            this.memory["pixel_" + decimalXCoord + ","+ decimalYCoord] = true;
        }

        let clearData = false;
        if (this.inputs[11]) clearData = true;

        for (let x = 0; x < ScreenGate.SCREEN_SIZE; x++) {
            for (let y = 0; y < ScreenGate.SCREEN_SIZE; y++) {
                if (this.memory["pixel_" + x + ","+ y] == null) this.memory["pixel_" + x + ","+ y] = false;

                if (clearData) this.memory["pixel_" + x + ","+ y] = false;

                this.infoBox.children[0].children[x + (y * ScreenGate.SCREEN_SIZE)].style.background = "rgb(13, 13, 13)";
                if (this.memory["pixel_" + x + ","+ y]) this.infoBox.children[0].children[x + (y * ScreenGate.SCREEN_SIZE)].style.background = "rgb(255, 255, 255)";
            }
        }
    }
}

class ALUGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 1 + 8 + 1 + 8 + 1 + 1 + 1 + 7 + 1 + 2;
		this.maxOutputs = 1 + 8 + 1 + 1;

		this.inputNames = ["$Num 1", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Num 2", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Carry", "Carry", "$Modes", "Add", "Sub", "Or", "And", "Nand", "Nor", "Xor", "$Shift", "Right", "Left"];
		this.outputNames = ["$Out", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Carry", "Carry"];
	
		this.gateHTMLElement.style.width = "150px";
		this.gateHTMLElement.style.minWidth = "150px";
		this.gateHTMLElement.style.height = "500px";
		this.gateHTMLElement.style.minHeight = "500px";

		// Add an info box
		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		this.gateHTMLElement.appendChild(infoBox);

		this.infoBox = infoBox;

		let contents = ["0\n00000000", "+", "0\n00000000", "=", "0\n00000000"];

		for (let i = 0; i < 5; i++) {
			let infoBoxChild = document.createElement("button");
			infoBoxChild.innerText = contents[i];
			infoBox.appendChild(infoBoxChild);
		}

        this.setupIOElements();
        this.setupGateInteractions();

        this.deleteButton.style.width = "150px";
		this.deleteButton.style.minWidth = "150px";
    }

    add8BitBinaryNumbers(binaryNum1, binaryNum2, carryIn) {
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
    }

    run(isPulse=false, data={}) {
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
            this.runConnections(carryOut, isPulse, 10);
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
            this.runConnections(false, isPulse, 10);
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
        for (let i = 1; i < 9; i++) this.runConnections(binaryOut[i - 1], isPulse, i);

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
}

class RAMGate extends LogicGate {

    constructor(gateType, position, gateHTMLElement, gateId, setupData) {
        super(gateType, position, gateHTMLElement, gateId, setupData);

        this.maxInputs = 1 + 8 + 1 + 8 + 1 + 3 + 1 + 1;
		this.maxOutputs = 1 + 8;

		this.inputNames = ["$Num", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Address", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8", "$Mode", "Read", "Write", "Clear", "$Clock", "Clock"];
		this.outputNames = ["$Out", "Bit 1", "Bit 2", "Bit 3", "Bit 4", "Bit 5", "Bit 6", "Bit 7", "Bit 8"];
	
		this.gateHTMLElement.style.width = "200px";
		this.gateHTMLElement.style.minWidth = "200px";
		this.gateHTMLElement.style.height = "500px";
		this.gateHTMLElement.style.minHeight = "500px";

		let infoBox = document.createElement("div");
		infoBox.classList.add("infoBox");
		this.gateHTMLElement.appendChild(infoBox);

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
		ramDataAddButton.id = this.gateId + "|ramDataAddButton"

		ramDataAddButton.addEventListener("click", e => {
			let parentGateID = Number(e.target.id.split("|")[0]);
			LogicGate.GATES["gate" + parentGateID].run(false, { "addData": true });
		})

		ramEditor.appendChild(ramDataBinary);
		ramEditor.appendChild(ramAddressBinary);
		ramEditor.appendChild(ramDataAddButton);

		let ramData = document.createElement("div");
		ramData.classList.add("ramData");
		ramData.id = "ramDataHolder";

		infoBox.appendChild(ramEditor);
		infoBox.appendChild(ramData);

		this.infoBox = infoBox;

        this.setupIOElements();
        this.setupGateInteractions();

        this.deleteButton.style.width = "200px";
		this.deleteButton.style.minWidth = "200px";
    }

    run(isPulse=false, data={}) {

        if (data["addData"]) {

            // Copy the values in the adress and value input fields
            let inputtedBinaryValue = this.infoBox.children[0].children[0].value.substring(0, 8);
            let inputtedBinaryAddress = this.infoBox.children[0].children[1].value.substring(0, 8);

            let formattedBinary = [];
            let formattedBinaryAddress = "";

            // Make sure binary value is 8 bits long
            for (let i = 0; inputtedBinaryValue.length < 8; i++) inputtedBinaryValue = "0" + inputtedBinaryValue;

            // Format the binary value into a list of true (1) and false (0) with index 0 being the most significant bit
            for (let i = 0; i < 8; i++) formattedBinary.push( (inputtedBinaryValue[i] || "0") == "1" ? true : false );

            // Make sure binary value is 8 bits long
            for (let i = 0; inputtedBinaryAddress.length < 8; i++) inputtedBinaryAddress = "0" + inputtedBinaryAddress;

            // Format the inputted binary adress into 1s and 0s
            for (let i = 0; i < 8; i++) formattedBinaryAddress += inputtedBinaryAddress[i] == "1" ? "1" : "0";

            // Save the value in the address
            this.memory[formattedBinaryAddress] = formattedBinary;

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
            for (let i = 17; i > 9; i--) binaryAddress += this.inputs[i] == true ? "1" : "0"

            // Fetch the binary data
            let binaryOut = [];

            // Only run if the clock is pulsed from low to high
            if (clock && !this.inputOn) {	

                if (mode == "read") {
                    binaryOut = [false,false,false,false,false,false,false,false];
                    if (binaryAddress in this.memory) binaryOut = this.memory[binaryAddress];
                }

                if (mode == "write") this.memory[binaryAddress] = binaryNumIn;
                if (mode == "clear") this.memory = {};
            }

            // Update all the connected output gates
            if (binaryOut.length == 8) for (let i = 1; i < 9; i++) this.runConnections(binaryOut[8 - i], isPulse, i);
            this.inputOn = clock;
        }

        // Clear the helper UIs children ready for replacement
        while (this.infoBox.children[1].children.length > 0) this.infoBox.children[1].removeChild(this.infoBox.children[1].children[0]);
        
        // Update helper UI
        for (const itemKey in this.memory) {

            let binaryNumInDec = 0;
            let binaryNumInString = "";
            
            for (let i = 0; i < 8; i++) {
                if(this.memory[itemKey][i]) binaryNumInDec += Math.pow(2, 7 - i);
                binaryNumInString += this.memory[itemKey][i] == true ? "1" : "0";
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
            deleteButton.id = this.gateId + "|" + itemKey + "|ramItemDelete";

            deleteButton.addEventListener("click", e => {

                let targetID = e.target.id.split("|");

                let clickedGate = Number(targetID[0]);
                let ramAdressToRemove = targetID[1];

                delete LogicGate.GATES["gate" + clickedGate].memory[ramAdressToRemove];
                LogicGate.GATES["gate" + clickedGate].run(true);
            })
            
            infoBoxChild.appendChild(itemInfo);
            infoBoxChild.appendChild(deleteButton);

            this.infoBox.children[1].appendChild(infoBoxChild);
        }
    }
}

export { LogicGate };