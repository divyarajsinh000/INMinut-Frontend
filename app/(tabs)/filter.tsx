import { Redirect } from 'expo-router';
export default function FilterRoute() { return <Redirect href={{ pathname: '/(tabs)', params: { openFilters: 'direct' } }} />; }
