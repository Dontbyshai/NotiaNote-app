import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Search, MapPin, X, School, LocateFixed } from 'lucide-react-native';
import { SearchSchools } from 'skolengojs';
import { geolocation } from 'pawnote';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const { height } = Dimensions.get('window');

export default function SchoolSearchModal({ service, onClose, onSelect }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);

    const searchAddress = async (q) => {
        try {
            const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=1`);
            const json = await res.json();
            if (json.features && json.features.length > 0) {
                const [lon, lat] = json.features[0].geometry.coordinates;
                return { lat, lon, city: json.features[0].properties.city };
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    };

    const handleLocationSearch = async () => {
        setLoading(true);
        setResults([]);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission d\'accès à la localisation refusée');
                setLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            if (service === 'skolengo_ent') {
                const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (address && address.city) {
                    setQuery(address.city);
                    const schools = await SearchSchools(address.city, 50);
                    setResults(schools.map(s => ({
                        id: s.id || s.name,
                        name: s.name,
                        address: `${s.location?.city || ''}`,
                        ref: s,
                        url: s.homepage
                    })));
                } else {
                    alert("Impossible de déterminer votre ville");
                }
            } else if (service === 'pronote') {
                const schools = await geolocation({ latitude, longitude });
                setResults(schools.map(s => {
                    const postalCode = s.cp || '';
                    const city = s.url.match(/\.([^.]+)\./)?.[1]?.toUpperCase() || 'Ville inconnue'; // Better fallback if city not directly in response 

                    // We extract city from the URL if possible, or leave as distance if that's all we have.
                    // The pawnote library usually returns limited info for geolocation, but let's try to extract city.
                    // Actually, let's log the object to see what's inside if needed, but for now:

                    return {
                        id: s.url,
                        name: s.name,
                        address: `${city} • ${(s.distance / 10).toFixed(1)} km`,
                        url: s.url
                    }
                }));
            }
        } catch (e) {
            console.error("Location error:", e);
            alert("Erreur lors de la géolocalisation");
        }
        setLoading(false);
    };

    const handleSearch = async () => {
        if (!query || query.length < 3) return;
        setLoading(true);
        setResults([]);
        try {
            if (service === 'skolengo_ent') {
                const schools = await SearchSchools(query, 50);
                setResults(schools.map(s => ({
                    id: s.id || s.name,
                    name: s.name,
                    address: `${s.location?.city || ''}`,
                    ref: s,
                    url: s.homepage
                })));
            } else if (service === 'pronote') {
                const coords = await searchAddress(query);
                if (coords) {
                    const schools = await geolocation({ latitude: coords.lat, longitude: coords.lon });
                    setResults(schools.map(s => {
                        return {
                            id: s.url,
                            name: s.name,
                            address: `${coords.city || ''} • ${(s.distance / 10).toFixed(1)} km`,
                            url: s.url
                        }
                    }));
                } else {
                    alert("Ville introuvable");
                }
            }
        } catch (e) {
            console.error("Search error:", e);
            alert("Erreur lors de la recherche");
        }
        setLoading(false);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={styles.container}>
                <View style={styles.dragIndicator} />

                <View style={styles.header}>
                    <Text style={styles.title}>Rechercher un établissement</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X color="#FFF" size={24} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <TouchableOpacity style={styles.locationBtn} activeOpacity={0.7} onPress={handleLocationSearch}>
                        <LocateFixed color="#A855F7" size={20} style={{ marginRight: 10 }} />
                        <Text style={styles.locationBtnText}>Autour de moi</Text>
                    </TouchableOpacity>

                    <View style={styles.searchBox}>
                        <Search color="#94A3B8" size={20} style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="Ville ou code postal (ex: Paris, 75001)"
                            placeholderTextColor="#64748B"
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={handleSearch}
                            autoFocus={false}
                        />
                    </View>

                    <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8} onPress={handleSearch}>
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.searchBtnText}>Rechercher</Text>}
                    </TouchableOpacity>

                    <FlatList
                        data={results}
                        keyExtractor={(item) => String(item.id)}
                        contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40, marginTop: 10 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            !loading && query.length >= 3 && results.length === 0 ? (
                                <Text style={styles.noResults}>Aucun établissement trouvé.</Text>
                            ) : null
                        )}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => onSelect(item)}>
                                <View style={styles.iconContainer}>
                                    <School color="#A855F7" size={20} />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.cardAddr}>{item.address}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    container: {
        height: height * 0.85,
        backgroundColor: '#121128',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        borderTopWidth: 1,
        borderTopColor: 'rgba(139, 92, 246, 0.4)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -20 },
        shadowOpacity: 0.8,
        shadowRadius: 35,
        elevation: 30,
        zIndex: 20,
    },
    dragIndicator: {
        width: 50,
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 10,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 10
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Text-Bold',
        letterSpacing: 0.5
    },
    closeBtn: { position: 'absolute', right: 24 },
    content: { flex: 1 },
    locationBtn: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        marginHorizontal: 28,
        marginBottom: 16,
        padding: 18,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    locationBtnText: { color: '#C084FC', fontFamily: 'Text-Bold', fontSize: 16 },

    searchBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        marginHorizontal: 28,
        marginBottom: 16,
        paddingHorizontal: 22,
        height: 64,
        borderRadius: 22,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(139, 92, 246, 0.25)',
    },
    input: { flex: 1, color: '#FFFFFF', fontSize: 16, fontFamily: 'Text-Medium' },

    searchBtn: {
        backgroundColor: '#A855F7',
        marginHorizontal: 28,
        height: 64,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    searchBtnText: { color: '#FFFFFF', fontFamily: 'Text-Bold', fontSize: 17, letterSpacing: 0.5 },

    card: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 18,
        borderRadius: 24,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    iconContainer: {
        width: 52,
        height: 52,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18
    },
    cardInfo: { flex: 1 },
    cardName: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Text-Bold', marginBottom: 3 },
    cardAddr: { color: '#94A3B8', fontSize: 13, fontFamily: 'Text-Medium' },
    noResults: { color: '#64748B', textAlign: 'center', marginTop: 50, fontFamily: 'Text-Medium' }
});
