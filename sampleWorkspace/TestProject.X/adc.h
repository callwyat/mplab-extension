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

#ifndef ADC_H
#define ADC_H

#include <stdint.h>
#include <stdbool.h>

/*** ADC Channel Definitions *****************************************/
#define ADC_CHANNEL_POTENTIOMETER ADC_CHANNEL_10

typedef enum
{
    ADC_CHANNEL_10 = 10
} ADC_CHANNEL;

typedef enum
{
    ADC_CONFIGURATION_DEFAULT,
    ADC_CONFIGURATION_AUTO_SAMPLE_CONVERT
} ADC_CONFIGURATION;

/*********************************************************************
* Function: ADC_ReadPercentage(ADC_CHANNEL channel);
*
* Overview: Reads the requested ADC channel and returns the percentage
*            of that conversions result (0-100%).
*
* PreCondition: channel is enabled via ADC_ChannelEnable()
*
* Input: ADC_CHANNEL channel - enumeration of the ADC channels
*        available in this demo.  They should be meaningful names and
*        not the names of the ADC pins on the device (as the demo code
*        may be ported to other boards).
*         i.e. ADC_ReadPercentage(ADC_CHANNEL_POTENTIOMETER);
*
* Output: uint8_t indicating the percentage of the result 0-100% or
*         0xFF for an error
*
********************************************************************/
uint8_t ADC_ReadPercentage(ADC_CHANNEL channel);


/*********************************************************************
* Function: ADC_Read10bit(ADC_CHANNEL channel);
*
* Overview: Reads the requested ADC channel and returns the 10-bit
*           representation of this data.
*
* PreCondition: channel is enabled via ADC_ChannelEnable()
*
* Input: ADC_CHANNEL channel - enumeration of the ADC channels
*        available in this demo.  They should be meaningful names and
*        not the names of the ADC pins on the device (as the demo code
*        may be ported to other boards).
*         i.e. - ADCReadPercentage(ADC_CHANNEL_POTENTIOMETER);
*
* Output: uint16_t the right adjusted 10-bit representation of the ADC
*         channel conversion or 0xFFFF for an error.
*
********************************************************************/
uint16_t ADC_Read10bit(ADC_CHANNEL channel);

/*********************************************************************
* Function: bool ADC_ChannelEnable(ADC_CHANNEL channel, ADC_CONFIGURATION configuration);
*
* Overview: Enables specified channel
*
* PreCondition: none
*
* Input: ADC_CHANNEL channel - the channel to enable
*
* Output: bool - true if successfully configured.  false otherwise.
*
********************************************************************/
bool ADC_ChannelEnable(ADC_CHANNEL channel);

/*********************************************************************
* Function: bool ADC_SetConfiguration(ADC_CONFIGURATION configuration)
*
* Overview: Configures the ADC module to specified setting
*
* PreCondition: none
*
* Input: ADC_CONFIGURATION configuration - the mode in which to run the ADC
*
* Output: bool - true if successfully configured.  false otherwise.
*
********************************************************************/
bool ADC_SetConfiguration(ADC_CONFIGURATION configuration);

#endif  //ADC_H
