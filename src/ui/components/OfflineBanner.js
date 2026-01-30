import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, StyleSheet, SafeAreaView, Platform, Dimensions } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { useGlobalAppContext } from '../../util/GlobalAppContext';

const { width } = Dimensions.get('window');

const OfflineBanner = () => {
    const { theme } = useGlobalAppContext();
    const [isConnected, setIsConnected] = useState(true);
    const slideAnimation = useRef(new Animated.Value(-100)).current; // Start hidden above

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = state.isConnected !== false; // Treat null as connected mostly
            setIsConnected(connected);

            if (!connected) {
                // Slide Down
                Animated.timing(slideAnimation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            } else {
                // Slide Up
                Animated.timing(slideAnimation, {
                    toValue: -150,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <Animated.View style={[
            styles.container,
            {
                backgroundColor: theme.dark ? '#ef4444' : '#fee2e2',
                transform: [{ translateY: slideAnimation }]
            }
        ]}>
            <SafeAreaView style={{ width: '100%' }}>
                <View style={styles.content}>
                    <WifiOff size={20} color={theme.dark ? '#FFF' : '#b91c1c'} style={{ marginRight: 10 }} />
                    <View>
                        <Text style={[styles.title, { color: theme.dark ? '#FFF' : '#991b1b' }]}>Mode Hors-Ligne</Text>
                        <Text style={[styles.subtitle, { color: theme.dark ? 'rgba(255,255,255,0.9)' : '#b91c1c' }]}>
                            Affichage des données en cache.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'flex-end',
        minHeight: Platform.OS === 'ios' ? 100 : 80,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 30 : 0
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
    }
});

export default OfflineBanner;
