import React from 'react';
import {Pressable,Text} from 'react-native';
export default function NomiChip({label}:{label:string}){
 return <Pressable style={{padding:10,borderRadius:18,borderWidth:1}}><Text>{label}</Text></Pressable>
}
