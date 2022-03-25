/*******************************************************************************
Copyright 2016 Microchip Technology Inc. (www.microchip.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*******************************************************************************/
#include <xc.h>
#include <stdint.h>

#include "leds_rgb.h"

#define LED_RGB_LD3_RED_LAT     LATCbits.LATC5
#define LED_RGB_LD3_GREEN_LAT   LATCbits.LATC6
#define LED_RGB_LD3_BLUE_LAT    LATCbits.LATC7

#define LED_RGB_LD3_RED_TRIS    TRISCbits.TRISC5
#define LED_RGB_LD3_GREEN_TRIS  TRISCbits.TRISC6
#define LED_RGB_LD3_BLUE_TRIS   TRISCbits.TRISC7

#define INPUT  1
#define OUTPUT 0

void LED_RGB_Enable(LED_RGB led)
{
    switch(led)
    {
        case LED_RGB_LD3:
            LED_RGB_LD3_RED_TRIS = OUTPUT ;
            LED_RGB_LD3_GREEN_TRIS = OUTPUT ;
            LED_RGB_LD3_BLUE_TRIS = OUTPUT ;
                   
            _RP21R = 13; //13 = OC1 -> RC5[RP21] (red)
            _RP22R = 14; //14 = OC2 -> RC6[RP22] (green)
            _RP23R = 15; //15 = OC3 -> RC7[RP23] (blue)
            
            OC1RS = 0x3FF;                  //period
            OC1CON2bits.SYNCSEL = 0x1F;     //self-sync
            OC1CON2bits.OCTRIG = 0;         //sync mode
            OC1CON1bits.OCTSEL = 0b111;     //FOSC/2
            OC1CON1bits.OCM = 0b110;        //edge aligned
            OC1CON2bits.TRIGSTAT = 1;       //manually trigger
            
            OC2RS = 0x3FF;                  //period
            OC2CON2bits.SYNCSEL = 0x1F;     //self-sync
            OC2CON2bits.OCTRIG = 0;         //sync mode
            OC2CON1bits.OCTSEL = 0b111;     //FOSC/2
            OC2CON1bits.OCM = 0b110;        //edge aligned
            OC2CON2bits.TRIGSTAT = 1;       //manually trigger
            
            OC3RS = 0x3FF;                  //period
            OC3CON2bits.SYNCSEL = 0x1F;     //self-sync
            OC3CON2bits.OCTRIG = 0;         //sync mode
            OC3CON1bits.OCTSEL = 0b111;     //FOSC/2
            OC3CON1bits.OCM = 0b110;        //edge aligned
            OC3CON2bits.TRIGSTAT = 1;       //manually trigger
            
            break;
        
        default:
            break;
    }
}

void LED_RGB_SetRed(LED_RGB led, uint16_t red)
{
    OC1R = ((uint16_t)red);
}
    
void LED_RGB_SetGreen(LED_RGB led, uint16_t green)
{
    OC2R = ((uint16_t)green);
}

void LED_RGB_SetBlue(LED_RGB led, uint16_t blue)
{
    OC3R = ((uint16_t)blue);
}

void LED_RGB_Set(LED_RGB led, uint16_t red, uint16_t green, uint16_t blue)
{
    LED_RGB_SetRed(led, red);
    LED_RGB_SetGreen(led, green);
    LED_RGB_SetBlue(led, blue);
}
