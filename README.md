<a href="https://github.com/GameDev46" title="Go to GitHub repo">
    <img src="https://img.shields.io/static/v1?label=GameDev46&message=|&color=Green&logo=github&style=for-the-badge&labelColor=1f1f22" alt="GameDev46 - Drogic_Pro">
    <img src="https://img.shields.io/badge/Version-0.9.7-green?style=for-the-badge&labelColor=1f1f22&color=Green" alt="GameDev46 - Drogic_Pro">
</a>


![Static Badge](https://img.shields.io/badge/--1f1f22?style=for-the-badge&logo=HTML5)
![Static Badge](https://img.shields.io/badge/--1f1f22?style=for-the-badge&logo=CSS3&logoColor=6060ef)
![Static Badge](https://img.shields.io/badge/--1f1f22?style=for-the-badge&logo=JavaScript)
    
<a href="https://github.com/GameDev46/Drogic_Pro/stargazers">
    <img src="https://img.shields.io/github/stars/GameDev46/Drogic_Pro?style=for-the-badge&labelColor=1f1f22" alt="stars - Drogic_Pro">
</a>
<a href="https://github.com/GameDev46/Drogic_Pro/forks">
    <img src="https://img.shields.io/github/forks/GameDev46/Drogic_Pro?style=for-the-badge&labelColor=1f1f22" alt="forks - Drogic_Pro">
</a>
<a href="https://github.com/GameDev46/Drogic_Pro/issues">
    <img src="https://img.shields.io/github/issues/GameDev46/Drogic_Pro?style=for-the-badge&labelColor=1f1f22&color=blue"/>
 </a>

<br>
<br>

<div align="left">
<a href="https://gamedev46.github.io/Drogic_Pro/">
    <img src="https://img.shields.io/badge/View_site-GH_Pages-2ea44f?style=for-the-badge&labelColor=1f1f22" alt="View site - GH Pages">
</a>
</div>

<br>

<p align="left">
<a href="https://twitter.com/gamedev46" target="blank"><img align="center" src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/twitter.svg" alt="gamedev46" height="30" width="40" /></a>
<a href="https://www.youtube.com/c/gamedev46" target="blank"><img align="center" src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/youtube.svg" alt="gamedev46" height="30" width="40" /></a>
</p>

# Drogic Pro

A revamped version of my old logic gate building program with a variety of new features and some much needed ease of use updates

## Usage

Simply use the dropdown to select the node type and hit the add node button to add it to the workspace. Once added you can move the gate around by clicking down, dragging and dropping it. To connect gates simply drag one of the outputs on the right of the gate and connect it to the input of another gate (left side).

## Gates

*INPUT* - Click to toggle its output high and low

*OUTPUT* - Lights up when the input is high and turns off when the input is low

*OSCILLATOR* - Toggles its output from high to low at the frequency specified by the user (maximum of 60Hz)

*DECIMAL INPUT* - Allows the user to enter an integer to the gate and then its corresponding binary representation will be output

*SCREEN* - Input an x and y coordinate and pulse the clock to turn on a pixel on the screen and then you can pulse the clock while clear is active to remove the contents of the screen

--------

*BUFFER* - Leaves the signal unaffected

*TOGGLE* - Toggles from low to high every time its input goes from low to high

*NOT* - NOT Gate

*AND* - AND Gate

*NAND* - NAND Gate

*OR* - OR Gate

*NOR* - NOR Gate

*XOR* - XOR Gate

--------

*LATCH* - When the clock is pulsed high it will store the data signal and output it through the out output

*8 BIT LATCH* - Functions the same as the regular latch but has 8 inputs and 8 outputs for use in larger circuits

--------

*FULL ADDER* - Takes in 3 inputs (bit 1, bit 2 and previous carry bit) and has 2 outputs (the sum of bit 1 and bit 2 and carry bit)

*ALU* - Performs an operation on 2 given 8 bit numbers

--------

*RAM* - When the clock is pusled high and write mode is active it will store the given 8 bit number in the given 8 bit address in ram, when the clock is pulsed high and read mode is active it will output the the 8 bit number stored in the selected adress and when the clock is pulsed high and it is in clear mode the entire memory of the ram will be reset to zeros

## Saving and Loading

- To save your creations simply press the save button on the top right navigation bar and a file will automatically be created and saved to your device.
- To load your creations simply press the load button and you will be prompted to select a valid text file to load into your workspace

