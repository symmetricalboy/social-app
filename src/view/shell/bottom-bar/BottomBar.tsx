import React, {ComponentProps} from 'react'
import {GestureResponderEvent, View} from 'react-native'
import Animated from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {BottomTabBarProps} from '@react-navigation/bottom-tabs'
import {StackActions} from '@react-navigation/native'

import {PressableScale} from '#/lib/custom-animations/PressableScale'
import {useHaptics} from '#/lib/haptics'
import {useDedupe} from '#/lib/hooks/useDedupe'
import {useMinimalShellFooterTransform} from '#/lib/hooks/useMinimalShellTransform'
import {useNavigationTabState} from '#/lib/hooks/useNavigationTabState'
import {usePalette} from '#/lib/hooks/usePalette'
import {clamp} from '#/lib/numbers'
import {getTabState, TabState} from '#/lib/routes/helpers'
import {s} from '#/lib/styles'
import {emitSoftReset} from '#/state/events'
import {useUnreadMessageCount} from '#/state/queries/messages/list-converations'
import {useUnreadNotifications} from '#/state/queries/notifications/unread'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {useLoggedOutViewControls} from '#/state/shell/logged-out'
import {useShellLayout} from '#/state/shell/shell-layout'
import {useCloseAllActiveElements} from '#/state/util'
import {Button} from '#/view/com/util/forms/Button'
import {Text} from '#/view/com/util/text/Text'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {Logo} from '#/view/icons/Logo'
import {Logotype} from '#/view/icons/Logotype'
import {atoms as a} from '#/alf'
import {useDialogControl} from '#/components/Dialog'
import {SwitchAccountDialog} from '#/components/dialogs/SwitchAccount'
import {
  Bell_Filled_Corner0_Rounded as BellFilled,
  Bell_Stroke2_Corner0_Rounded as Bell,
} from '#/components/icons/Bell'
import {
  HomeOpen_Filled_Corner0_Rounded as HomeFilled,
  HomeOpen_Stoke2_Corner0_Rounded as Home,
} from '#/components/icons/HomeOpen'
import {MagnifyingGlass_Filled_Stroke2_Corner0_Rounded as MagnifyingGlassFilled} from '#/components/icons/MagnifyingGlass'
import {MagnifyingGlass2_Stroke2_Corner0_Rounded as MagnifyingGlass} from '#/components/icons/MagnifyingGlass2'
import {
  Message_Stroke2_Corner0_Rounded as Message,
  Message_Stroke2_Corner0_Rounded_Filled as MessageFilled,
} from '#/components/icons/Message'
import {styles} from './BottomBarStyles'

type TabOptions =
  | 'Home'
  | 'Search'
  | 'Notifications'
  | 'MyProfile'
  | 'Feeds'
  | 'Messages'

export function BottomBar({navigation}: BottomTabBarProps) {
  const {hasSession, currentAccount} = useSession()
  const pal = usePalette('default')
  const {_} = useLingui()
  const safeAreaInsets = useSafeAreaInsets()
  const {footerHeight} = useShellLayout()
  const {isAtHome, isAtSearch, isAtNotifications, isAtMyProfile, isAtMessages} =
    useNavigationTabState()
  const numUnreadNotifications = useUnreadNotifications()
  const numUnreadMessages = useUnreadMessageCount()
  const footerMinimalShellTransform = useMinimalShellFooterTransform()
  const {data: profile} = useProfileQuery({did: currentAccount?.did})
  const {requestSwitchToAccount} = useLoggedOutViewControls()
  const closeAllActiveElements = useCloseAllActiveElements()
  const dedupe = useDedupe()
  const accountSwitchControl = useDialogControl()
  const playHaptic = useHaptics()
  const iconWidth = 28

  const showSignIn = React.useCallback(() => {
    closeAllActiveElements()
    requestSwitchToAccount({requestedAccount: 'none'})
  }, [requestSwitchToAccount, closeAllActiveElements])

  const showCreateAccount = React.useCallback(() => {
    closeAllActiveElements()
    requestSwitchToAccount({requestedAccount: 'new'})
    // setShowLoggedOut(true)
  }, [requestSwitchToAccount, closeAllActiveElements])

  const onPressTab = React.useCallback(
    (tab: TabOptions) => {
      const state = navigation.getState()
      const tabState = getTabState(state, tab)
      if (tabState === TabState.InsideAtRoot) {
        emitSoftReset()
      } else if (tabState === TabState.Inside) {
        dedupe(() => navigation.dispatch(StackActions.popToTop()))
      } else {
        dedupe(() => navigation.navigate(`${tab}Tab`))
      }
    },
    [navigation, dedupe],
  )
  const onPressHome = React.useCallback(() => onPressTab('Home'), [onPressTab])
  const onPressSearch = React.useCallback(
    () => onPressTab('Search'),
    [onPressTab],
  )
  const onPressNotifications = React.useCallback(
    () => onPressTab('Notifications'),
    [onPressTab],
  )
  const onPressProfile = React.useCallback(() => {
    onPressTab('MyProfile')
  }, [onPressTab])
  const onPressMessages = React.useCallback(() => {
    onPressTab('Messages')
  }, [onPressTab])

  const onLongPressProfile = React.useCallback(() => {
    playHaptic()
    accountSwitchControl.open()
  }, [accountSwitchControl, playHaptic])

  const renderHomeIcon = React.useCallback(
    () =>
      isAtHome ? (
        <HomeFilled
          width={iconWidth + 1}
          style={[styles.ctrlIcon, pal.text, styles.homeIcon]}
        />
      ) : (
        <Home
          width={iconWidth + 1}
          style={[styles.ctrlIcon, pal.text, styles.homeIcon]}
        />
      ),
    [isAtHome, pal.text],
  )

  const renderSearchIcon = React.useCallback(
    () =>
      isAtSearch ? (
        <MagnifyingGlassFilled
          width={iconWidth + 2}
          style={[styles.ctrlIcon, pal.text, styles.searchIcon]}
        />
      ) : (
        <MagnifyingGlass
          testID="bottomBarSearchTabItem"
          width={iconWidth + 2}
          style={[styles.ctrlIcon, pal.text, styles.searchIcon]}
        />
      ),
    [isAtSearch, pal.text],
  )

  const renderMessagesIcon = React.useCallback(
    () =>
      isAtMessages ? (
        <MessageFilled
          width={iconWidth - 1}
          style={[styles.ctrlIcon, pal.text, styles.feedsIcon]}
        />
      ) : (
        <Message
          width={iconWidth - 1}
          style={[styles.ctrlIcon, pal.text, styles.feedsIcon]}
        />
      ),
    [isAtMessages, pal.text],
  )

  const renderNotificationsIcon = React.useCallback(
    () =>
      isAtNotifications ? (
        <BellFilled
          width={iconWidth}
          style={[styles.ctrlIcon, pal.text, styles.bellIcon]}
        />
      ) : (
        <Bell
          width={iconWidth}
          style={[styles.ctrlIcon, pal.text, styles.bellIcon]}
        />
      ),
    [isAtNotifications, pal.text],
  )

  const renderProfileIcon = React.useCallback(
    () => (
      <View style={styles.ctrlIconSizingWrapper}>
        {isAtMyProfile ? (
          <View
            style={[
              styles.ctrlIcon,
              pal.text,
              styles.profileIcon,
              styles.onProfile,
              {borderColor: pal.text.color},
            ]}>
            <UserAvatar
              avatar={profile?.avatar}
              size={iconWidth - 3}
              // See https://github.com/bluesky-social/social-app/pull/1801:
              usePlainRNImage={true}
              type={profile?.associated?.labeler ? 'labeler' : 'user'}
            />
          </View>
        ) : (
          <View style={[styles.ctrlIcon, pal.text, styles.profileIcon]}>
            <UserAvatar
              avatar={profile?.avatar}
              size={iconWidth - 3}
              // See https://github.com/bluesky-social/social-app/pull/1801:
              usePlainRNImage={true}
              type={profile?.associated?.labeler ? 'labeler' : 'user'}
            />
          </View>
        )}
      </View>
    ),
    [isAtMyProfile, profile?.avatar, profile?.associated?.labeler, pal.text],
  )

  return (
    <>
      <SwitchAccountDialog control={accountSwitchControl} />

      <Animated.View
        style={[
          styles.bottomBar,
          pal.view,
          pal.border,
          {paddingBottom: clamp(safeAreaInsets.bottom, 15, 30)},
          footerMinimalShellTransform,
        ]}
        onLayout={evt => {
          footerHeight.set(evt.nativeEvent.layout.height)
        }}>
        {hasSession ? (
          <>
            <TabItem
              testID="bottomBarHomeTabItem"
              renderIcon={renderHomeIcon}
              onPress={onPressHome}
              accessibilityRole="tab"
              accessibilityLabel={_(msg`Home`)}
              accessibilityHint=""
            />
            <TabItem
              testID="bottomBarSearchTabItem"
              renderIcon={renderSearchIcon}
              onPress={onPressSearch}
              accessibilityRole="search"
              accessibilityLabel={_(msg`Search`)}
              accessibilityHint=""
            />
            <TabItem
              testID="bottomBarMessagesTabItem"
              renderIcon={renderMessagesIcon}
              onPress={onPressMessages}
              notificationCount={numUnreadMessages.numUnread}
              accessible={true}
              accessibilityRole="tab"
              accessibilityLabel={_(msg`Chat`)}
              accessibilityHint={
                numUnreadMessages.count > 0
                  ? _(msg`${numUnreadMessages.numUnread} unread items`)
                  : ''
              }
            />
            <TabItem
              testID="bottomBarNotificationsTabItem"
              renderIcon={renderNotificationsIcon}
              onPress={onPressNotifications}
              notificationCount={numUnreadNotifications}
              accessible={true}
              accessibilityRole="tab"
              accessibilityLabel={_(msg`Notifications`)}
              accessibilityHint={
                numUnreadNotifications === ''
                  ? ''
                  : _(msg`${numUnreadNotifications} unread items`)
              }
            />
            <TabItem
              testID="bottomBarProfileTabItem"
              renderIcon={renderProfileIcon}
              onPress={onPressProfile}
              onLongPress={onLongPressProfile}
              accessibilityRole="tab"
              accessibilityLabel={_(msg`Profile`)}
              accessibilityHint=""
            />
          </>
        ) : (
          <>
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
                paddingBottom: 2,
                paddingLeft: 14,
                paddingRight: 6,
                gap: 8,
              }}>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Logo width={28} />
                <View style={{paddingTop: 4}}>
                  <Logotype width={80} fill={pal.text.color} />
                </View>
              </View>

              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <Button
                  onPress={showCreateAccount}
                  accessibilityHint={_(msg`Sign up`)}
                  accessibilityLabel={_(msg`Sign up`)}>
                  <Text type="md" style={[{color: 'white'}, s.bold]}>
                    <Trans>Sign up</Trans>
                  </Text>
                </Button>

                <Button
                  type="default"
                  onPress={showSignIn}
                  accessibilityHint={_(msg`Sign in`)}
                  accessibilityLabel={_(msg`Sign in`)}>
                  <Text type="md" style={[pal.text, s.bold]}>
                    <Trans>Sign in</Trans>
                  </Text>
                </Button>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </>
  )
}

interface TabItemProps
  extends Pick<
    ComponentProps<typeof PressableScale>,
    | 'accessible'
    | 'accessibilityRole'
    | 'accessibilityHint'
    | 'accessibilityLabel'
  > {
  testID?: string
  renderIcon: () => React.ReactNode
  notificationCount?: string
  onPress?: (event: GestureResponderEvent) => void
  onLongPress?: (event: GestureResponderEvent) => void
}

function TabItem({
  testID,
  renderIcon,
  notificationCount,
  onPress,
  onLongPress,
  accessible,
  accessibilityHint,
  accessibilityLabel,
}: TabItemProps) {
  return (
    <PressableScale
      testID={testID}
      style={[styles.ctrl, a.flex_1]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      targetScale={0.8}>
      {renderIcon()}
      {notificationCount ? (
        <View style={[styles.notificationCount, a.rounded_full]}>
          <Text style={styles.notificationCountLabel}>{notificationCount}</Text>
        </View>
      ) : undefined}
    </PressableScale>
  )
}
