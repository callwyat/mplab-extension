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

#ifndef LEDS_RGB_H
#define LEDS_RGB_H

/** Type definitions *********************************/
typedef enum
{
    LED_RGB_NONE,
    LED_RGB_LD3
} LED_RGB;

/*********************************************************************
* Function: bool LED_RGB_Enable(LED_RGB led);
*
* Overview: Configures the LED_RGB for use by the other LED_RGB API
*
* PreCondition: none
*
* Input: LED_RGB led - enumeration of the LEDs available in this
*        demo.  They should be meaningful names and not the names of
*        the LEDs on the silkscreen on the board (as the demo code may
*        be ported to other boards).
*
* Output: none
*
********************************************************************/
void LED_RGB_Enable(LED_RGB led);

/*********************************************************************
* Function: void LED_RGB_Set(LED_RGB led, uint16_t red, uint16_t green, uint16_t blue);
*
* Overview: Sets the 10-bit color for the specified RGB LED.
*
* PreCondition: none
*
* Input: LED_RGB led - LED to set
*        uint16_t red - red value [0-1023]
*        uint16_t green - green value [0-1023]
*        uint16_t blue - blue value [0-1023]
*
* Output: none
*
********************************************************************/
void LED_RGB_Set(LED_RGB led, uint16_t red, uint16_t green, uint16_t blue);

#define LED_RGB_COUNT 1

#endif
