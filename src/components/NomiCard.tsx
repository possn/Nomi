import React from 'react';
import {View,StyleSheet} from 'react-native';
export default function NomiCard({children}:{children:React.ReactNode}){
 return <View style={s.c}>{children}</View>
}
const s=StyleSheet.create({c:{backgroundColor:'#fff',borderRadius:24,padding:20,shadowOpacity:.05,shadowRadius:12,elevation:2}});
