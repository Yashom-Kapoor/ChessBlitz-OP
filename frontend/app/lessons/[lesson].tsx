import GlassBlurView from "@/components/GlassBlurView";
import { lessonFiles } from "@/components/lessons/Lessons";
import { BackgroundContext } from "@/context/Backgrounds";
import GlobalStyle from "@/context/GlobalStyle";
import { useTheme } from "@/context/ThemeContext";
import { useGlobalSearchParams, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Icon } from "expo-router/unstable-native-tabs";
import { use, useEffect, useLayoutEffect, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Markdown from 'react-native-markdown-display';
import LessonPuzzle from "@/components/puzzles/LessonPuzzle";

export default function Lesson() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const global = useGlobalSearchParams();
    const { theme } = useTheme();
    const [content, setContent] = useState<string[]>([]);
    const [page, setPage] = useState<number>(1);

    const lessonId = params.lesson as string;
    const dynamicTitle = `Lesson: ${params.lesson}`;
    const isTablet = global.isTablet === 'true';

    useLayoutEffect(() => {
        navigation.setOptions({
            title: dynamicTitle,
        });

        const asset = lessonFiles[`lesson${lessonId}`];
        if (!asset) return;

        const uri = Image.resolveAssetSource(asset).uri;

        fetch(uri)
            .then(res => res.text())
            .then(text => {
            const splitContent = text.split(/(\*\*\*PAGE\*\*\*|\*\*\*PUZZLE\*\*\*)/);
            setContent(splitContent);
            })
            .catch(err => console.log('md load error', err));
    }, [router, dynamicTitle]); // Run whenever navigation or title changes

    function pageBack() {
        if (page > 1) {
            setPage(page - 1);
        }
    }

    function pageForward() {
        if (page < (content.length - 1) / 2) {
            setPage(page + 1);
        } else if (page === (content.length - 1) / 2) {
            router.back();
            router.setParams({ lessonCompleted: parseInt(lessonId) });
        }
    }

    const styles = GlobalStyle(theme, isTablet);

    if (content[page * 2 - 1] === '***PAGE***') {
        return (
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
                <BackgroundContext theme={theme}>
                    <ScrollView contentContainerStyle={{ ...styles.scrollContainer }}>

                        <Markdown style={{
                            body: {fontFamily: 'Nunito'},
                            paragraph: {...styles.p, color: theme.primaryText},
                            heading1: {...styles.h1, marginTop: 50, color: theme.titleText},
                            heading2: {...styles.h2, marginTop: 20, color: theme.titleText},
                            heading3: {...styles.h3, marginTop: 15, color: theme.titleText},
                            heading4: {...styles.h4, marginTop: 10, color: theme.titleText},
                            heading5: {...styles.h5, marginTop: 10, color: theme.titleText},
                            heading6: {...styles.h6, marginTop: 10, color: theme.titleText},
                            blockquote: {...styles.blockquote, backgroundColor: theme.primaryButton},
                            code_inline: { ...styles.p, color: theme.primaryText, backgroundColor: theme.primaryButton },
                            code_block: { ...styles.p, color: theme.primaryText, backgroundColor: theme.primaryButton },
                            fence: { color: theme.secondaryText, fontSize: isTablet ? 16 : 14, lineHeight: isTablet ? 18 : 16, backgroundColor: theme.secondaryButton, borderRadius: 10 },
                            list_item: {...styles.bullet, color: theme.primaryText},
                            table: {borderWidth: 2, borderColor: theme.secondaryButton, ...styles.p},
                            thead: {backgroundColor: theme.secondaryButton, color: theme.secondaryText},
                            tbody: {color: theme.primaryText},
                        }}>
                            {String(content[page * 2])}
                        </Markdown>

                        <View style={{...styles.hStack, gap: isTablet ? 30 : 20}}>

                            <TouchableOpacity style={{flex: 1, opacity: page > 1 ? 1 : 0.4}} onPress={() => {
                                    pageBack();
                                }}>
                                <GlassBlurView theme={theme} isTablet={isTablet} color={theme.primaryButton} glass={'clear'} />
                                <Text style={{...styles.h4, color: theme.primaryText, textAlign: 'center', padding: 15}}>
                                    Previous
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={{flex: 1}} onPress={() => {
                                    pageForward();
                                }}>
                                <GlassBlurView theme={theme} isTablet={isTablet} color={theme.secondaryButton} glass={'clear'} />
                                <Text style={{...styles.h4, color: theme.secondaryText, textAlign: 'center', padding: 15}}>
                                    {page < (content.length - 1) / 2 ? 'Next' : 'Complete'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </BackgroundContext>
            </GestureHandlerRootView>
        );
    }
    if (content[page * 2 - 1] === '***PUZZLE***') {
        return (
            <LessonPuzzle
                key={`puzzle-${page}`}
                length={content.length}
                page={page}
                pageBack={pageBack}
                pageForward={pageForward}
                pagePrevPuzzle={page > 1 && content[page * 2 - 3] === '***PUZZLE***'}
                pageNextPuzzle={page < (content.length - 1) / 2 && content[page * 2 + 1] === '***PUZZLE***'}
                puzzleId={content[page * 2].trim()}
            />
        );
    }

}