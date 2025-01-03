import { CancellationToken, CompletionContext, CompletionItem, CompletionItemProvider, CompletionList, Hover, HoverProvider, MarkdownString, Position, ProviderResult, TextDocument, commands } from 'vscode'

const instructionsInfo = [
    ['ADDLW', `|ADDLW|ADD literal to W|
|-|-|
|Syntax|ADDLW k|
|Operands|0 ≤ k ≤ 255|
|Operation|(W) + k → W|
|Status Affected|N, OV, C, DC, Z|
|Encoding|0000 \\| 1111 \\| kkkk \\| kkkk|
|Description|The contents of W are added to the 8-bit literal ‘k’ and the result is placed in W.|
|Words|1|
|Cycles|1|`],
    ['ADDWF', `|ADDWF|ADD W to f|
|-|-|
|Syntax|ADDWF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(W) + (f) → dest|
|Status Affected|N, OV, C, DC, Z|
|Encoding|0010 \\| 01da \\| ffff \\| ffff|
|Description|Add W to register ‘f’. If ‘d’ is ‘0’, the result is stored in W. If ‘d’ is ‘1’, the result is stored back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['ADDWFC', `|ADDWFC|ADD W and CARRY bit to f|
|-|-|
|Syntax|ADDWFC f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(W) + (f) + (C) → dest|
|Status Affected|N,OV, C, DC, Z|
|Encoding|0010 \\| 00da \\| ffff \\| ffff|
|Description|Add W, the CARRY flag and data memory location ‘f’. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed in data memory location ‘f’. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['ANDLW', `|ANDLW|AND literal with W|
|-|-|
|Syntax|ANDLW k|
|Operands|0 ≤ k ≤ 255|
|Operation|(W) .AND. k → W|
|Status Affected|N, Z|
|Encoding|0000 \\| 1011 \\| kkkk \\| kkkk|
|Description|The contents of W are AND’ed with the 8-bit literal ‘k’. The result is placed in W.|
|Words|1|
|Cycles|1|`],
    ['ANDWF', `|ANDWF|AND W with f|
|-|-|
|Syntax|ANDWF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(W) .AND. (f) → dest|
|Status Affected|N, Z|
|Encoding|0001 \\| 01da \\| ffff \\| ffff|
|Description|The contents of W are AND’ed with register ‘f’. If ‘d’ is ‘0’, the result is stored in W. If ‘d’ is ‘1’, the result is stored back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['BC', `|BC|Branch if Carry|
|-|-|
|Syntax|BC n|
|Operands|-128 ≤ n ≤ 127|
|Operation|if CARRY bit is ‘1’ (PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1110 \\| 0010 \\| nnnn \\| nnnn|
|Description|If the CARRY bit is ‘1’, then the program will branch. The two’s complement number ‘2n’ is added to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is then a two-cycle instruction.|
|Words|1|
|Cycles|1(2)|`],
    ['BCF', `|BCF|Bit Clear f|
|-|-|
|Syntax|BCF f, b {,a}|
|Operands|0 ≤ f ≤ 255 0 ≤ b ≤ 7 a ∈ [0,1]|
|Operation|0 → f<b>|
|Status Affected|None|
|Encoding|1001 \\| bbba \\| ffff \\| ffff|
|Description|Bit ‘b’ in register ‘f’ is cleared. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['BN', `|BN|Branch if Negative|
|-|-|
|Syntax|BN n|
|Operands|-128 ≤ n ≤ 127|
|Operation|if NEGATIVE bit is ‘1’ (PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1110 \\| 0110 \\| nnnn \\| nnnn|
|Description|If the NEGATIVE bit is ‘1’, then the program will branch. The two’s complement number ‘2n’ is added to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is then a two-cycle instruction.|
|Words|1|
|Cycles|1(2)|`],
    ['BNC', `|BNC|Branch if Not Carry|
|-|-|
|Syntax|BNC n|
|Operands|-128 ≤ n ≤ 127|
|Operation|if CARRY bit is ‘0’ (PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1110 \\| 0011 \\| nnnn \\| nnnn|
|Description|If the CARRY bit is ‘0’, then the program will branch. The two’s complement number ‘2n’ is added to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is then a two-cycle instruction.|
|Words|1|
|Cycles|1(2)|`],
    ['BNN', `|BNN|Branch if Not Negative|
|-|-|
|Syntax|BNN n|
|Operands|-128 ≤ n ≤ 127|
|Operation|if NEGATIVE bit is ‘0’ (PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1110 \\| 0111 \\| nnnn \\| nnnn|
|Description|If the NEGATIVE bit is ‘0’, then the program will branch. The two’s complement number ‘2n’ is added to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is then a two-cycle instruction.|
|Words|1|
|Cycles|1(2)|`],
    ['BNOV', `|BNOV|Branch if Not Overflow|
|-|-|
|Syntax|BNOV n|
|Operands|-128 ≤ n ≤ 127|
|Operation|if OVERFLOW bit is ‘0’ (PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1110 \\| 0101 \\| nnnn \\| nnnn|
|Description|If the OVERFLOW bit is ‘0’, then the program will branch. The two’s complement number ‘2n’ is added to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is then a two-cycle instruction.|
|Words|1|
|Cycles|1(2)|`],
    ['BNZ', `|BNZ|Branch if Not Zero|
|-|-|
|Syntax|BNZ n|
|Operands|-128 ≤ n ≤ 127|
|Operation|if ZERO bit is ‘0’ (PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1110 \\| 0001 \\| nnnn \\| nnnn|
|Description|If the ZERO bit is ‘0’, then the program will branch. The two’s complement number ‘2n’ is added to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is then a two-cycle instruction.|
|Words|1|
|Cycles|1(2)|`],
    ['BRA', `|BRA|Unconditional Branch|
|-|-|
|Syntax|BRA n|
|Operands|-1024 ≤ n ≤ 1023|
|Operation|(PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1101 \\| 0nnn \\| nnnn \\| nnnn|
|Description|Add the two’s complement number ‘2n’ to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is a two-cycle instruction.|
|Words|1|
|Cycles|2|`],
    ['BSF', `|BSF|Bit Set f|
|-|-|
|Syntax|BSF f, b {,a}|
|Operands|0 ≤ f ≤ 255 0 ≤ b ≤ 7 a ∈ [0,1]|
|Operation|1 → f<b>|
|Status Affected|None|
|Encoding|1000 \\| bbba \\| ffff \\| ffff|
|Description|Bit ‘b’ in register ‘f’ is set. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['BTFSC', `|BTFSC|Bit Test File, Skip if Clear|
|-|-|
|Syntax|BTFSC f, b {,a}|
|Operands|0 ≤ f ≤ 255 0 ≤ b ≤ 7 a ∈ [0,1]|
|Operation|skip if (f<b>) = 0|
|Status Affected|None|
|Encoding|1011 \\| bbba \\| ffff \\| ffff|
|Description|If bit ‘b’ in register ‘f’ is ‘0’, then the next instruction is skipped. If bit ‘b’ is ‘0’, then the next instruction fetched during the current instruction execution is discarded and a NOP is executed instead, making this a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['BTFSS', `|BTFSS|Bit Test File, Skip if Set|
|-|-|
|Syntax|BTFSS f, b {,a}|
|Operands|0 ≤ f ≤ 255 0 ≤ b < 7 a ∈ [0,1]|
|Operation|skip if (f<b>) = 1|
|Status Affected|None|
|Encoding|1010 \\| bbba \\| ffff \\| ffff|
|Description|If bit ‘b’ in register ‘f’ is ‘1’, then the next instruction is skipped. If bit ‘b’ is ‘1’, then the next instruction fetched during the current instruction execution is discarded and a NOP is executed instead, making this a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['BTG', `|BTG|Bit Toggle f|
|-|-|
|Syntax|BTG f, b {,a}|
|Operands|0 ≤ f ≤ 255 0 ≤ b < 7 a ∈ [0,1]|
|Operation|(f<b>) → f<b>|
|Status Affected|None|
|Encoding|0111 \\| bbba \\| ffff \\| ffff|
|Description|Bit ‘b’ in data memory location ‘f’ is inverted. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['BOV', `|BOV|Branch if Overflow|
|-|-|
|Syntax|BOV n|
|Operands|-128 ≤ n ≤ 127|
|Operation|if OVERFLOW bit is ‘1’ (PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1110 \\| 0100 \\| nnnn \\| nnnn|
|Description|If the OVERFLOW bit is ‘1’, then the program will branch. The two’s complement number ‘2n’ is added to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is then a two-cycle instruction.|
|Words|1|
|Cycles|1(2)|`],
    ['BZ', `|BZ|Branch if Zero|
|-|-|
|Syntax|BZ n|
|Operands|-128 ≤ n ≤ 127|
|Operation|if ZERO bit is ‘1’ (PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1110 \\| 0000 \\| nnnn \\| nnnn|
|Description|If the ZERO bit is ‘1’, then the program will branch. The two’s complement number ‘2n’ is added to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is then a two-cycle instruction.|
|Words|1|
|Cycles|1(2)|`],
    ['CALL', `|CALL|Subroutine Call|
|-|-|
|Syntax|CALL k {,s}|
|Operands|0 ≤ k ≤ 1048575 s ∈ [0,1]|
|Operation|(PC) + 4 → TOS, k → PC<20:1>, if s = 1 (W) → WS, (Status) → STATUSS, (BSR) → BSRS|
|Status Affected|None|
|Encoding: 1st word (k<7:0>) 2nd word(k<19:8>)|1110 1111 \\| 110s k19kkk \\| k7kkk kkkk \\| kkkk0 kkkk8|
|Description|Subroutine call of entire 2-Mbyte memory range. First, return address (PC + 4) is pushed onto the return stack. If ‘s’ = 1, the W, Status and BSR registers are also pushed into their respective shadow registers, WS, STATUSS and BSRS. If ‘s’ = 0, no update occurs (default). Then, the 20-bit value ‘k’ is loaded into PC<20:1>. CALL is a two-cycle instruction.|
|Words|2|
|Cycles|2|`],
    ['CLRF', `|CLRF|Clear f|
|-|-|
|Syntax|CLRF f {,a}|
|Operands|0 ≤ f ≤ 255 a ∈ [0,1]|
|Operation|000h → f 1 → Z|
|Status Affected|Z|
|Encoding|0110 \\| 101a \\| ffff \\| ffff|
|Description|Clears the contents of the specified register. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['CLRWDT', `|CLRWDT|Clear Watchdog Timer|
|-|-|
|Syntax|CLRWDT|
|Operands|None|
|Operation|000h → WDT, 000h → WDT postscaler, 1 → TO, 1 → PD|
|Status Affected|TO, PD|
|Encoding|0000 \\| 0000 \\| 0000 \\| 0100|
|Description|CLRWDT instruction resets the Watchdog Timer. It also resets the postscaler of the WDT. Status bits, TO and PD, are set.|
|Words|1|
|Cycles|1|`],
    ['COMF', `|COMF|Complement f|
|-|-|
|Syntax|COMF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f) → dest|
|Status Affected|N, Z|
|Encoding|0001 \\| 11da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are complemented. If ‘d’ is ‘0’, the result is stored in W. If ‘d’ is ‘1’, the result is stored back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['CPFSEQ', `|CPFSEQ|Compare f with W, skip if f = W|
|-|-|
|Syntax|CPFSEQ f {,a}|
|Operands|0 ≤ f ≤ 255 a ∈ [0,1]|
|Operation|(f) – (W), skip if (f) = (W) (unsigned comparison)|
|Status Affected|None|
|Encoding|0110 \\| 001a \\| ffff \\| ffff|
|Description|Compares the contents of data memory location ‘f’ to the contents of W by performing an unsigned subtraction. If ‘f’ = W, then the fetched instruction is discarded and a NOP is executed instead, making this a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['CPFSGT', `|CPFSGT|Compare f with W, skip if f > W|
|-|-|
|Syntax|CPFSGT f {,a}|
|Operands|0 ≤ f ≤ 255 a ∈ [0,1]|
|Operation|(f) – (), skip if (f) > (W) (unsigned comparison)|
|Status Affected|None|
|Encoding|0110 \\| 010a \\| ffff \\| ffff|
|Description|Compares the contents of data memory location ‘f’ to the contents of the W by performing an unsigned subtraction. If the contents of ‘f’ are greater than the contents of WREG, then the fetched instruction is discarded and a NOP is executed instead, making this a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['CPFSLT', `|CPFSLT|Compare f with W, skip if f < W|
|-|-|
|Syntax|CPFSLT f {,a}|
|Operands|0 ≤ f ≤ 255 a ∈ [0,1]|
|Operation|(f) – (), skip if (f) < (W) (unsigned comparison)|
|Status Affected|None|
|Encoding|0110 \\| 000a \\| ffff \\| ffff|
|Description|Compares the contents of data memory location ‘f’ to the contents of W by performing an unsigned subtraction. If the contents of ‘f’ are less than the contents of W, then the fetched instruction is discarded and a NOP is executed instead, making this a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['DAW', `|DAW|Decimal Adjust W Register|
|-|-|
|Syntax|DAW|
|Operands|None|
|Operation|If [W<3:0> > 9] or [DC = 1] then (W<3:0>) + 6 → W<3:0>; else (W<3:0>) → W<3:0>; If [W<7:4> + DC > 9] or [C = 1] then (W<7:4>) + 6 + DC → W<7:4> ; else (W<7:4>) + DC → W<7:4>|
|Status Affected|C|
|Encoding|0000 \\| 0000 \\| 0000 \\| 0111|
|Description|DAW adjusts the 8-bit value in W, resulting from the earlier addition of two variables (each in packed BCD format) and produces a correct packed BCD result.|
|Words|1|
|Cycles|1|`],
    ['DECF', `|DECF|Decrement f|
|-|-|
|Syntax|DECF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f) – 1 → dest|
|Status Affected|C, DC, N, OV, Z|
|Encoding|0000 \\| 01da \\| ffff \\| ffff|
|Description|Decrement register ‘f’. If ‘d’ is ‘0’, the result is stored in W. If ‘d’ is ‘1’, the result is stored back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['DECFSZ', `|DECFSZ|Decrement f, skip if 0|
|-|-|
|Syntax|DECFSZ f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f) – 1 → dest, skip if result = 0|
|Status Affected|None|
|Encoding|0010 \\| 11da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are decremented. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed back in register ‘f’ (default). If the result is ‘0’, the next instruction, which is already fetched, is discarded and a NOP is executed instead, making it a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['DCFSNZ', `|DCFSNZ|Decrement f, skip if not 0|
|-|-|
|Syntax|DCFSNZ f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f) – 1 → dest, skip if result ≠ 0|
|Status Affected|None|
|Encoding|0100 \\| 11da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are decremented. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed back in register ‘f’ (default). If the result is not ‘0’, the next instruction, which is already fetched, is discarded and a NOP is executed instead, making it a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['GOTO', `|GOTO|Unconditional Branch|
|-|-|
|Syntax|GOTO k|
|Operands|0 ≤ k ≤ 1048575|
|Operation|k → PC<20:1>|
|Status Affected|None|
|Encoding: 1st word (k<7:0>) 2nd word(k<19:8>)|1110 1111 \\| 1111 k19kkk \\| k7kkk kkkk \\| kkkk0 kkkk8|
|Description|GOTO allows an unconditional branch anywhere within entire 2-Mbyte memory range. The 20-bit value ‘k’ is loaded into PC<20:1>. GOTO is always a two-cycle instruction.|
|Words|2|
|Cycles|2|`],
    ['INCF', `|INCF|Increment f|
|-|-|
|Syntax|INCF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f) + 1 → dest|
|Status Affected|C, DC, N, OV, Z|
|Encoding|0010 \\| 10da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are incremented. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['INCFSZ', `|INCFSZ|Increment f, skip if 0|
|-|-|
|Syntax|INCFSZ f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f) + 1 → dest, skip if result = 0|
|Status Affected|None|
|Encoding|0011 \\| 11da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are incremented. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed back in register ‘f’ (default). If the result is ‘0’, the next instruction, which is already fetched, is discarded and a NOP is executed instead, making it a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['INFSNZ', `|INFSNZ|Increment f, skip if not 0|
|-|-|
|Syntax|INFSNZ f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f) + 1 → dest, skip if result ≠ 0|
|Status Affected|None|
|Encoding|0100 \\| 10da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are incremented. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed back in register ‘f’ (default). If the result is not ‘0’, the next instruction, which is already fetched, is discarded and a NOP is executed instead, making it a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['IORLW', `|IORLW|Inclusive OR literal with W|
|-|-|
|Syntax|IORLW k|
|Operands|0 ≤ k ≤ 255|
|Operation|(W) .OR. k → W|
|Status Affected|N, Z|
|Encoding|0000 \\| 1001 \\| kkkk \\| kkkk|
|Description|The contents of W are ORed with the 8-bit literal ‘k’. The result is placed in W.|
|Words|1|
|Cycles|1|`],
    ['IORWF', `|IORWF|Inclusive OR W with f|
|-|-|
|Syntax|IORWF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(W) .OR. (f) → dest|
|Status Affected|N, Z|
|Encoding|0001 \\| 00da \\| ffff \\| ffff|
|Description|Inclusive OR W with register ‘f’. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['LFSR', `|LFSR|Load FSR|
|-|-|
|Syntax|LFSR f, k|
|Operands|0 ≤ f ≤ 2 0 ≤ k ≤ 4095|
|Operation|k → FSRf|
|Status Affected|None|
|Encoding|1110 1111 \\| 1110 0000 \\| 00ff k7kkk \\| k11kkk kkkk|
|Description|The 12-bit literal ‘k’ is loaded into the File Select Register pointed to by ‘f’.|
|Words|2|
|Cycles|2|`],
    ['MOVF', `|MOVF|Move f|
|-|-|
|Syntax|MOVF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|f → dest|
|Status Affected|N, Z|
|Encoding|0101 \\| 00da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are moved to a destination dependent upon the status of ‘d’. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed back in register ‘f’ (default). Location ‘f’ can be anywhere in the 256-byte bank. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['MOVFF', `|MOVFF|Move f to f|
|-|-|
|Syntax|MOVFF fs,fd|
|Operands|0 ≤ fs ≤ 4095 0 ≤ fd ≤ 4095|
|Operation|(fs) → fd|
|Status Affected|None|
|Encoding: 1st word (source) 2nd word (destin.)|1100 1111 \\| ffff ffff \\| ffff ffff \\| ffffs ffffd|
|Description|The contents of source register ‘fs’ are moved to destination register ‘fd’. The location of source ‘fs’ can be anywhere in the 4096-byte data space (000h to FFFh) and location of destination ‘fd’ can also be anywhere from 000h to FFFh. Either source or destination can be W (a useful special situation). MOVFF is particularly useful for transferring a data memory location to a peripheral register (such as the transmit buffer or an I O port). The MOVFF instruction cannot use the PCL, TOSU, TOSH or TOSL as the destination register.|
|Words|2|
|Cycles|2 (3)|`],
    ['MOVLB', `|MOVLB|Move literal to low nibble in BSR|
|-|-|
|Syntax|MOVLW k|
|Operands|0 ≤ k ≤ 255|
|Operation|k → BSR|
|Status Affected|None|
|Encoding|0000 \\| 0001 \\| kkkk \\| kkkk|
|Description|The 8-bit literal ‘k’ is loaded into the Bank Select Register (BSR). The value of BSR<7:4> always remains ‘0’, regardless of the value of k7:k4.|
|Words|1|
|Cycles|1|`],
    ['MOVLW', `|MOVLW|Move literal to W|
|-|-|
|Syntax|MOVLW k|
|Operands|0 ≤ k ≤ 255|
|Operation|k → W|
|Status Affected|None|
|Encoding|0000 \\| 1110 \\| kkkk \\| kkkk|
|Description|The 8-bit literal ‘k’ is loaded into W.|
|Words|1|
|Cycles|1|`],
    ['MOVWF', `|MOVWF|Move W to f|
|-|-|
|Syntax|MOVWF f {,a}|
|Operands|0 ≤ f ≤ 255 a ∈ [0,1]|
|Operation|(W) → f|
|Status Affected|None|
|Encoding|0110 \\| 111a \\| ffff \\| ffff|
|Description|Move data from W to register ‘f’. The location ‘f’ can be anywhere in the 256-byte bank. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['MULLW', `|MULLW|Multiply literal with W|
|-|-|
|Syntax|MULLW k|
|Operands|0 ≤ k ≤ 255|
|Operation|(W) x k → PRODH:PRODL|
|Status Affected|None|
|Encoding|0000 \\| 1101 \\| kkkk \\| kkkk|
|Description|An unsigned multiplication is carried out between the contents of W and the 8-bit literal ‘k’. The 16-bit result is placed in the PRODH:PRODL register pair. PRODH contains the high byte. W is unchanged. None of the Status flags are affected. Note that neither overflow nor carry is possible in this operation. A zero result is possible but not detected.|
|Words|1|
|Cycles|1|`],
    ['MULWF', `|MULWF|Multiply W with f|
|-|-|
|Syntax|MULWF f {,a}|
|Operands|0 ≤ f ≤ 255 a ∈ [0,1]|
|Operation|(W) x (f) → PRODH:PRODL|
|Status Affected|None|
|Encoding|0000 \\| 001a \\| ffff \\| ffff|
|Description|An unsigned multiplication is carried out between the contents of W and the register file location ‘f’. The 16-bit result is stored in the PRODH:PRODL register pair. PRODH contains the high byte. Both W and ‘f’ are unchanged. None of the Status flags are affected. Note that neither overflow nor carry is possible in this operation. A zero result is possible but not detected. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['NEGF', `|NEGF|Negate f|
|-|-|
|Syntax|NEGF f {,a}|
|Operands|0 ≤ f ≤ 255 a ∈ [0,1]|
|Operation|( f ) + 1 → f|
|Status Affected|N, OV, C, DC, Z|
|Encoding|0110 \\| 110a \\| ffff \\| ffff|
|Description|Location ‘f’ is negated using two’s complement. The result is placed in the data memory location ‘f’. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['NOP', `|NOP|No Operation|
|-|-|
|Syntax|NOP|
|Operands|None|
|Operation|No operation|
|Status Affected|None|
|Encoding|0000 1111 \\| 0000 xxxx \\| 0000 xxxx \\| 0000 xxxx|
|Description|No operation.|
|Words|1|
|Cycles|1|`],
    ['POP', `|POP|Pop Top of Return Stack|
|-|-|
|Syntax|POP|
|Operands|None|
|Operation|(TOS) → bit bucket|
|Status Affected|None|
|Encoding|0000 \\| 0000 \\| 0000 \\| 0110|
|Description|The TOS value is pulled off the return stack and is discarded. The TOS value then becomes the previous value that was pushed onto the return stack. This instruction is provided to enable the user to properly manage the return stack to incorporate a software stack.|
|Words|1|
|Cycles|1|`],
    ['PUSH', `|PUSH|Push Top of Return Stack|
|-|-|
|Syntax|PUSH|
|Operands|None|
|Operation|(PC + 2) → TOS|
|Status Affected|None|
|Encoding|0000 \\| 0000 \\| 0000 \\| 0101|
|Description|The PC + 2 is pushed onto the top of the return stack. The previous TOS value is pushed down on the stack. This instruction allows implementing a software stack by modifying TOS and then pushing it onto the return stack.|
|Words|1|
|Cycles|1|`],
    ['RCALL', `|RCALL|Relative Call|
|-|-|
|Syntax|RCALL n|
|Operands|-1024 ≤ n ≤ 1023|
|Operation|(PC) + 2 → TOS, (PC) + 2 + 2n → PC|
|Status Affected|None|
|Encoding|1101 \\| 1nnn \\| nnnn \\| nnnn|
|Description|Subroutine call with a jump up to 1K from the current location. First, return address (PC + 2) is pushed onto the stack. Then, add the two’s complement number ‘2n’ to the PC. Since the PC will have incremented to fetch the next instruction, the new address will be PC + 2 + 2n. This instruction is a two-cycle instruction.|
|Words|1|
|Cycles|2|`],
    ['RESET', `|RESET|Reset|
|-|-|
|Syntax|RESET|
|Operands|None|
|Operation|Reset all registers and flags that are affected by a MCLR Reset.|
|Status Affected|All|
|Encoding|0000 \\| 0000 \\| 1111 \\| 1111|
|Description|This instruction provides a way to execute a MCLR Reset by software.|
|Words|1|
|Cycles|1|`],
    ['RETFIE', `|RETFIE|Return from Interrupt|
|-|-|
|Syntax|RETFIE {s}|
|Operands|s ∈ [0,1]|
|Operation|(TOS) → PC, 1 → GIE GIEH or PEIE GIEL, if s = 1 (WS) → W, (STATUSS) → Status, (BSRS) → BSR, PCLATU, PCLATH are unchanged.|
|Status Affected|GIE GIEH, PEIE GIEL.|
|Encoding|0000 \\| 0000 \\| 0001 \\| 000s|
|Description|Return from interrupt. Stack is popped and Top-of-Stack (TOS) is loaded into the PC. Interrupts are enabled by setting either the high- or low-priority Global Interrupt Enable bit. If ‘s’ = 1, the contents of the shadow registers, WS, STATUSS and BSRS, are loaded into their corresponding registers, W, Status and BSR. If ‘s’ = 0, no update of these registers occurs (default).|
|Words|1|
|Cycles|2|`],
    ['RETLW', `|RETLW|Return literal to W|
|-|-|
|Syntax|RETLW k|
|Operands|0 ≤ k ≤ 255|
|Operation|k → W, (TOS) → PC, PCLATU, PCLATH are unchanged|
|Status Affected|None|
|Encoding|0000 \\| 1100 \\| kkkk \\| kkkk|
|Description|W is loaded with the 8-bit literal ‘k’. The Program Counter is loaded from the top of the stack (the return address). The high address latch (PCLATH) remains unchanged.|
|Words|1|
|Cycles|2|`],
    ['RETURN', `|RETURN|Return from Subroutine|
|-|-|
|Syntax|RETURN {s}|
|Operands|s ∈ [0,1]|
|Operation|(TOS) → PC, if s = 1 (WS) → W, (STATUSS) → Status, (BSRS) → BSR, PCLATU, PCLATH are unchanged|
|Status Affected|None|
|Encoding|0000 \\| 0000 \\| 0001 \\| 001s|
|Description|Return from subroutine. The stack is popped and the top of the stack (TOS) is loaded into the Program Counter. If ‘s’= 1, the contents of the shadow registers, WS, STATUSS and BSRS, are loaded into their corresponding registers, W, Status and BSR. If ‘s’ = 0, no update of these registers occurs (default).|
|Words|1|
|Cycles|2|`],
    ['RLCF', `|RLCF|Rotate Left f through Carry|
|-|-|
|Syntax|RLCF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f<n>) → dest<n + 1>, (f<7>) → C, (C) → dest<0>|
|Status Affected|C, N, Z|
|Encoding|0011 \\| 01da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are rotated one bit to the left through the CARRY flag. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is stored back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['RLNCF', `|RLNCF|Rotate Left f (No Carry)|
|-|-|
|Syntax|RLNCF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f<n>) → dest<n + 1>, (f<7>) → dest<0>|
|Status Affected|N, Z|
|Encoding|0100 \\| 01da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are rotated one bit to the left. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is stored back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['RRCF', `|RRCF|Rotate Right f through Carry|
|-|-|
|Syntax|RRCF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f<n>) → dest<n – 1>, (f<0>) → C, (C) → dest<7>|
|Status Affected|C, N, Z|
|Encoding|0011 \\| 00da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are rotated one bit to the right through the CARRY flag. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['RRNCF', `|RRNCF|Rotate Right f (No Carry)|
|-|-|
|Syntax|RRNCF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f<n>) → dest<n – 1>, (f<0>) → dest<7>|
|Status Affected|N, Z|
|Encoding|0100 \\| 00da \\| ffff \\| ffff|
|Description|The contents of register ‘f’ are rotated one bit to the right. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank will be selected (default), overriding the BSR value. If ‘a’ is ‘1’, then the bank will be selected as per the BSR value. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['SETF', `|SETF|Set f|
|-|-|
|Syntax|SETF f {,a}|
|Operands|0 ≤ f ≤ 255 a ∈ [0,1]|
|Operation|FFh → f|
|Status Affected|None|
|Encoding|0110 \\| 100a \\| ffff \\| ffff|
|Description|The contents of the specified register are set to FFh. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['SLEEP', `|SLEEP|Enter Sleep mode|
|-|-|
|Syntax|SLEEP|
|Operands|None|
|Operation|00h → WDT, 0 → WDT postscaler, 1 → TO, 0 → PD|
|Status Affected|TO, PD|
|Encoding|0000 \\| 0000 \\| 0000 \\| 0011|
|Description|The Power-Down (PD) Status bit is cleared. The Time-out (TO) Status bit is set. Watchdog Timer and its postscaler are cleared. The processor is put into Sleep mode with the oscillator stopped.|
|Words|1|
|Cycles|1|`],
    ['SUBFWB', `|SUBFWB|Subtract f from W with borrow (Continued)|
|-|-|
|Syntax|SUBFWB f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(W) – (f) – (C) → dest|
|Status Affected|N, OV, C, DC, Z|
|Encoding|0101 \\| 01da \\| ffff \\| ffff|
|Description|Subtract register ‘f’ and CARRY flag (borrow) from W (two’s complement method). If ‘d’ is ‘0’, the result is stored in W. If ‘d’ is ‘1’, the result is stored in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['SUBLW', `|SUBLW|Subtract W from literal|
|-|-|
|Syntax|SUBLW k|
|Operands|0 ≤ k ≤ 255|
|Operation|k – (W) →|
|Status Affected|N, OV, C, DC, Z|
|Encoding|0000 \\| 1000 \\| kkkk \\| kkkk|
|Description|W is subtracted from the 8-bit literal ‘k’. The result is placed in W.|
|Words|1|
|Cycles|1|`],
    ['SUBWF', `|SUBWF|Subtract W from f|
|-|-|
|Syntax|SUBWF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f) – (W) → dest|
|Status Affected|N, OV, C, DC, Z|
|Encoding|0101 \\| 11da \\| ffff \\| ffff|
|Description|Subtract W from register ‘f’ (two’s complement method). If ‘d’ is ‘0’, the result is stored in W. If ‘d’ is ‘1’, the result is stored back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['SUBWFB', `|SUBWFB|Subtract W from f with Borrow|
|-|-|
|Syntax|SUBWFB f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f) – (W) – (C) → dest|
|Status Affected|N, OV, C, DC, Z|
|Encoding|0101 \\| 10da \\| ffff \\| ffff|
|Description|Subtract W and the CARRY flag (borrow) from register ‘f’ (two’s complement method). If ‘d’ is ‘0’, the result is stored in W. If ‘d’ is ‘1’, the result is stored back in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['SWAPF', `|SWAPF|Swap f|
|-|-|
|Syntax|SWAPF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(f<3:0>) → dest<7:4>, (f<7:4>) → dest<3:0>|
|Status Affected|None|
|Encoding|0011 \\| 10da \\| ffff \\| ffff|
|Description|The upper and lower nibbles of register ‘f’ are exchanged. If ‘d’ is ‘0’, the result is placed in W. If ‘d’ is ‘1’, the result is placed in register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`],
    ['TBLRD', `|TBLRD|Table Read|
|-|-|
|Syntax|TBLRD ( *; *+; *-; +*)|
|Operands|None|
|Operation|if TBLRD *, (Prog Mem (TBLPTR)) → TABLAT; TBLPTR – No Change; if TBLRD *+, (Prog Mem (TBLPTR)) → TABLAT; (TBLPTR) + 1 → TBLPTR; if TBLRD *-, (Prog Mem (TBLPTR)) → TABLAT; (TBLPTR) – 1 → TBLPTR; if TBLRD +*, (TBLPTR) + 1 → TBLPTR; (Prog Mem (TBLPTR)) → TABLAT;|
|Status Affected|None|
|Encoding|0000 \\| 0000 \\| 0000 \\| 10nn nn=0 * =1 *+ =2 *- =3 +*|
|Description|This instruction is used to read the contents of Program Memory (P.M.). To address the program memory, a pointer called Table Pointer (TBLPTR) is used. The TBLPTR (a 21-bit pointer) points to each byte in the program memory. TBLPTR has a 2-Mbyte address range. TBLPTR[0] = 0: Least Significant Byte of Program Memory Word TBLPTR[0] = 1: Most Significant Byte of Program Memory Word The TBLRD instruction can modify the value of TBLPTR as follows: no change post-increment post-decrement pre-increment|
|Words|1|
|Cycles|2|`],
    ['TBLWT (Continued)', `|TBLWT (Continued)|Table Write|
|-|-|
|Syntax|TBLWT ( *; *+; *-; +*)|
|Operands|None|
|Operation|if TBLWT*, (TABLAT) → Holding Register; TBLPTR – No Change; if TBLWT*+, (TABLAT) → Holding Register; (TBLPTR) + 1 → TBLPTR; if TBLWT*-, (TABLAT) → Holding Register; (TBLPTR) – 1 → TBLPTR; if TBLWT+*, (TBLPTR) + 1 → TBLPTR; (TABLAT) → Holding Register;|
|Status Affected|None|
|Encoding|0000 \\| 0000 \\| 0000 \\| 11nn nn=0 * =1 *+ =2 *- =3 +*|
|Description|This instruction uses the LSBs of TBLPTR to determine which of the holding registers the TABLAT is written to. The holding registers are used to program the contents of Program Memory (P.M.). Refer to the “Program Flash Memory” section for additional details on programming Flash memory. The TBLPTR (a 21-bit pointer) points to each byte in the program memory. TBLPTR has a 2-MByte address range. The LSb of the TBLPTR selects which byte of the program memory location to access. TBLPTR[0] = 0: Least Significant Byte of Program Memory Word TBLPTR[0] = 1: Most Significant Byte of Program Memory Word The TBLWT instruction can modify the value of TBLPTR as follows: no change post-increment post-decrement pre-increment|
|Words|1|
|Cycles|2|
|Q Cycle Activity|
|Q1|Q2 \\| Q3 \\| Q4|
|Decode|No operation \\| No operation \\| No operation|
|No operation|No  operation (Read TABLAT) \\| No operation \\| No operation (Write to Holding  Register )|`],
    ['TSTFSZ', `|TSTFSZ|Test f, skip if 0|
|-|-|
|Syntax|TSTFSZ f {,a}|
|Operands|0 ≤ f ≤ 255 a ∈ [0,1]|
|Operation|skip if f = 0|
|Status Affected|None|
|Encoding|0110 \\| 011a \\| ffff \\| ffff|
|Description|If ‘f’ = 0, the next instruction fetched during the current instruction execution is discarded and a NOP is executed, making this a two-cycle instruction. If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1(2) Note: Three cycles if skip and followed by a two-word instruction.|`],
    ['XORLW', `|XORLW|Exclusive OR literal with W|
|-|-|
|Syntax|XORLW k|
|Operands|0 ≤ k ≤ 255|
|Operation|(W) .XOR. k →|
|Status Affected|N, Z|
|Encoding|0000 \\| 1010 \\| kkkk \\| kkkk|
|Description|The contents of W are XORed with the 8-bit literal ‘k’. The result is placed in W.|
|Words|1|
|Cycles|1|`],
    ['XORWF', `|XORWF|Exclusive OR W with f|
|-|-|
|Syntax|XORWF f {,d {,a}}|
|Operands|0 ≤ f ≤ 255 d ∈ [0,1] a ∈ [0,1]|
|Operation|(W) .XOR. (f) → dest|
|Status Affected|N, Z|
|Encoding|0001 \\| 10da \\| ffff \\| ffff|
|Description|Exclusive OR the contents of W with register ‘f’. If ‘d’ is ‘0’, the result is stored in W. If ‘d’ is ‘1’, the result is stored back in the register ‘f’ (default). If ‘a’ is ‘0’, the Access Bank is selected. If ‘a’ is ‘1’, the BSR is used to select the GPR bank. If ‘a’ is ‘0’ and the extended instruction set is enabled, this instruction operates in Indexed Literal Offset Addressing mode whenever f ≤ 95 (5Fh). See Byte-Oriented and Bit-Oriented Instructions in Indexed Literal Offset Mode for details.|
|Words|1|
|Cycles|1|`]
];

export class AsmCompletionItemProvider implements CompletionItemProvider {
    instructions: CompletionItem[];

    constructor() {
        this.instructions = instructionsInfo.map(i => {
            const item = new CompletionItem(i[0]);
            item.documentation = new MarkdownString(i[1]);
            return item;
        })
    }

    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
        const a = document.getText();
        
        return this.instructions;
    }
}

export class AsmHoverProvider implements HoverProvider {
    constructor() {
    }

    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
        return new Hover('hover');
    }
}