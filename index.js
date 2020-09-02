import React, { Component } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import { isEqual } from 'lodash';
import get from 'lodash/get';
import moment from 'moment';
import SocketIOClient from 'socket.io-client';
import { styles } from './styles';
import { ChatListView } from '../../components';
import { getAWSImageURL, getProductString, showAlert } from '../../utils';
import { chatSelector, inboxSelector, userSelector } from '../../redux/selector';
import { ChatActions, InboxActions, RouteActions } from '../../redux';
import Colors from '../../themes/colors';
import AppConfig from '../../config/appConfig';
import { getUpdatedChat } from '../../service/api';
import { AppConstants, InvalidAlerts } from '../../constants';

class Chat extends Component {
  constructor(props) {
    super(props);
    this.state = {
      chatHistory: [],
      showIndicator: false,
      isLoadingMore: false,
      isAvailableLoadMore: true
    };
    this.socket = SocketIOClient(AppConfig.SOCKET_URL);
    this.addListener(props.chat.jobId);
  }

  componentDidMount() {
    const { chat } = this.props;

    this.props.updateCurrentScreen('ChatScreen');
    this.setState({ chatHistory: [], showIndicator: true });
    console.info('chat.jobId', chat.jobId);
    console.info('chat.clientId', chat.clientId);
    this.props.getChatHistory(chat.jobId, chat.clientId, this.page);

    this._interval = setInterval(() => {
      this.onGetChatHistory();
    }, 1000 * 60 * 1);
  }

  componentWillReceiveProps(nextProps) {
    if (!isEqual(this.props.chat, nextProps.chat)) {

      if (this.props.chat.fetchChat !== nextProps.chat.fetchChat && !nextProps.chat.fetchChat) {

        this.setState({ showIndicator: false });

        if (this.props.chat.freelancerSeen !== nextProps.chat.freelancerSeen) {

          if (!this.props.chat.chatHistory.length) {
            this.setState({ showIndicator: false, chatHistory: nextProps.chat.chatHistory });
            if (nextProps.chat.chatHistory.length) {
              if (nextProps.chat.freelancerSeen !== nextProps.chat.chatHistory[0]._index) {
                this.socket.emit('freelancerSetSeen', {
                  jobId: nextProps.chat.jobId,
                  userToken: get(nextProps.user, 'apiToken', ''),
                  messageId: nextProps.chat.chatHistory[0]._index
                });
              }
            }
          }
        }
      } else {
        if (this.props.chat.chatHistory.toString() !== nextProps.chat.chatHistory.toString()) {
          this.setState({
            chatHistory: nextProps.chat.chatHistory,
            isLoadingMore: false
          });
          if (nextProps.chat.chatHistory.length) {
            if (nextProps.chat.freelancerSeen !== nextProps.chat.chatHistory[0]._index) {
              this.socket.emit('freelancerSetSeen', {
                jobId: nextProps.chat.jobId,
                userToken: get(nextProps.user, 'apiToken', ''),
                messageId: nextProps.chat.chatHistory[0]._index
              });
            }
          }
        }
        if (this.props.chat.jobId !== nextProps.chat.jobId) {
          this.setState({
            chatHistory: [],
            showIndicator: true,
            isLoadingMore: false,
            isAvailableLoadMore: true
          });
          this.props.getChatHistory(nextProps.chat.jobId, nextProps.chat.clientId, this.page);
          this.removeListener(this.props.chat.jobId);
          this.addListener(nextProps.chat.jobId);
          this._interval = setInterval(() => {
            this.onGetChatHistory();
          }, 1000 * 60 * 1);
        }
      }
    }
  }

  componentWillUnmount() {
    const { chat } = this.props;
    this.removeListener(chat.jobId);
    this.props.clearChat();
    this.props.updateCurrentScreen(null);
  }

  onGetChatHistory = async () => {
    const { chat, user } = this.props;
    const ret = await getUpdatedChat(chat.jobId, chat.freelancerSeen);
    console.info('ret~~~~~~', ret);
    if (ret && ret.success) {
      const newChats = this.getNewChat(ret.chatHistory, chat.freelancerSeen);
      if (newChats.length === 0) {
        return;
      }
      this.socket.emit('freelancerSetSeen', {
        jobId: chat.jobId,
        userToken: get(user, 'apiToken', ''),
        messageId: newChats[0]._index
      });
      const updatedChatHistory = [...this.state.chatHistory];
      for (let index = 0; index < newChats.length; index += 1) {
        const filteredItem = updatedChatHistory.filter(chatItem =>
          chatItem._id === newChats[newChats.length - index - 1]._id);
        if (filteredItem.length !== 0) {
          const i = updatedChatHistory.indexOf(filteredItem[0]);
          // updatedChatHistory.splice(i, 1);
          updatedChatHistory[i] = { ...newChats[newChats.length - index - 1] };
          newChats[newChats.length - index - 1].removed = true;
        }
      }
      const updatedNewChats = newChats.filter(newChat => !newChat.removed);
      this.props.updateChat(
        [...updatedNewChats, ...updatedChatHistory],
        chat.freelancerUnreadCount,
        newChats[0]._index
      );
    }
  };

  onSend = (messages) => {
    const { user, chat } = this.props;
    this.socket.emit('freelancerSend', {
      jobId: chat.jobId,
      clientId: chat.clientId,
      type: messages[0].text.length ? 1 : 2,
      text: messages[0].text,
      freelancerId: get(user, 'userInformation.id', 19971013),
      userToken: get(user, 'apiToken', ''),
      freelancerFirstName: get(user, 'userInformation.firstName', ''),
      freelancerAvatar: get(user, 'userInformation.avatarLink', ''),
      createdAt: messages[0].createdAt,
      _id: messages[0]._id
    });
    console.info('messages', {
      jobId: chat.jobId,
      clientId: chat.clientId,
      type: messages[0].text.length ? 1 : 2,
      text: messages[0].text,
      freelancerId: get(user, 'userInformation.id', 19971013),
      userToken: get(user, 'apiToken', ''),
      freelancerFirstName: get(user, 'userInformation.firstName', ''),
      freelancerAvatar: get(user, 'userInformation.avatarLink', ''),
      createdAt: messages[0].createdAt,
      _id: messages[0]._id
    });
    this.setState({ chatHistory: [...messages, ...this.state.chatHistory] });
  };

  onReceivedMessage = (data) => {
    console.info('onReceivedMessage', data);
    const { user, chat } = this.props;
    if (data.success) {
      this.socket.emit('freelancerSetSeen', {
        jobId: chat.jobId,
        userToken: get(user, 'apiToken', ''),
        messageId: data.lastChat._index
      });
      const updatedChatHistory = [...this.state.chatHistory];
      let isUpdated = false;
      for (let index = 0; index < updatedChatHistory.length; index += 1) {
        if (updatedChatHistory[index]._id === data.lastChat._id) {
          updatedChatHistory[index] = { ...data.lastChat };
          isUpdated = true;
          break;
        }
      }
      if (!isUpdated) {
        updatedChatHistory.unshift({ ...data.lastChat });
      }
      console.info('this.state.chatHistory', this.state.chatHistory);
      console.info('updatedChatHistory', updatedChatHistory);
      this.props.updateChat(
        [...updatedChatHistory],
        data.freelancerUnreadCount,
        data.freelancerSeen
      );
    } else {
      if (data.errorCode === 3) {
        showAlert('Snapr \u00AE', data.msg || '', this.goBack);
      }
    }
  };

  onLoadMore = (data) => {
    this.setState({
      // chatHistory: [...this.state.chatHistory, ...data.chatHistory],
      isAvailableLoadMore: data.loadMore
    });
    if (data.chatHistory.length !== 0) {
      this.props.updateChat(
        [...this.state.chatHistory, ...data.chatHistory],
        this.props.chat.freelancerUnreadCount,
        this.props.chat.freelancerSeen
      );
    } else {
      this.setState({ isLoadingMore: false });
    }
  };

  onSocketDisconnect = (reason) => {
    if (this.showSocketErrorDialog === 0 && !AppConstants.networkIsConnected) {
      showAlert('Snapr \u00AE', InvalidAlerts.networkConnection, this.goBack);
      this.showSocketErrorDialog += 1;
    }
  };

  onGetLastSeen = (data) => {
    console.info('onGetLastSeen', data);
    if (data.success) {
      this.props.updateChat(null, data.freelancerUnreadCount, data.freelancerSeen);
    }
  };

  onJobDetails = () => {
    const { chat } = this.props;
    if (get(this.props.navigation, 'state.params.isFromJobDetails', false)) {
      this.props.navigation.goBack();
    } else {
      if (chat.jobDetails) {
        this.props.navigation.navigate('JobDetails', { jobDetails: chat.jobDetails, isFromChat: true });
      } else {
        this.props.navigation.navigate('JobDetails', { jobID: chat.jobId, isFromChat: true });
      }
    }
  };

  getNewChat = (chatHistory, freelancerSeen) => {
    const newMessages = [];
    chatHistory.forEach((chat) => {
      if (chat._index > freelancerSeen) {
        // newMessages.unshift(chat);
        newMessages.push(chat);
      }
    });
    return newMessages;
  };

  removeListener = (jobId) => {
    const { user } = this.props;

    clearInterval(this._interval);
    this.socket.off(
      `freelancerListener-jobId-${jobId}-userToken-${user.apiToken}`,
      this.onReceivedMessage
    );
    this.socket.off(
      `freelancerListener-LoadMore-jobId-${jobId}-userToken-${user.apiToken}`,
      this.onLoadMore
    );
    this.socket.off(
      `freelancerListener-Seen-jobId-${jobId}-userToken-${user.apiToken}`,
      this.onGetLastSeen
    );
    this.socket.off('disconnect', this.onSocketDisconnect);
  };

  addListener = (jobId) => {
    const { user } = this.props;
    this.socket.on(
      `freelancerListener-jobId-${jobId}-userToken-${user.apiToken}`,
      this.onReceivedMessage
    );
    this.socket.on(
      `freelancerListener-LoadMore-jobId-${jobId}-userToken-${user.apiToken}`,
      this.onLoadMore
    );
    this.socket.on(
      `freelancerListener-Seen-jobId-${jobId}-userToken-${user.apiToken}`,
      this.onGetLastSeen
    );
    this.socket.on('disconnect', this.onSocketDisconnect);
    this.showSocketErrorDialog = 0;
  };

  loadMore = (messageId) => {
    const { chat, user } = this.props;
    this.setState({ isLoadingMore: true });
    this.socket.emit('freelancerLoadMore', {
      jobId: chat.jobId,
      userToken: get(user, 'apiToken', ''),
      messageId
    });
  };

  goBack = () => {
    this.props.getInboxData();
    this.props.navigation.goBack();
  };

  renderHeader = () => {
    const { chat } = this.props;
    const startDate = moment(new Date(get(chat, 'jobDetails.startTime', '')));
    return (
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={this.goBack} style={styles.backContainer}>
          <FontAwesome name="chevron-left" size={20} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {`${get(chat, 'clientInfo.firstName', '')}`}
        </Text>
        <View style={styles.adressWrapper}>
          <Text style={styles.subHeaderText1}>
            {`Order #${get(chat, 'jobDetails.case', '')}`}
          </Text>
          <Text style={styles.subHeaderText}>
            {`${get(chat, 'jobDetails.address', '')}, ${get(chat, 'jobDetails.postCode', '')}`}
          </Text>
          <Text style={styles.thirdHeaderText}>
            {getProductString(get(chat, 'jobDetails.product', []))}
          </Text>
        </View>
        <Text style={styles.subHeaderText}>
          {startDate.format('dddd DD MMMM YYYY')}
        </Text>
      </View>
    );
  };

  renderActivity = () => (
    <View style={styles.activityContainer}>
      <ActivityIndicator color={Colors.blue} />
    </View>
  );

  renderMainContent = () => {
    const { chatHistory, isLoadingMore, isAvailableLoadMore } = this.state;
    const { user, chat } = this.props;
    let label = '';
    if (get(chat.jobDetails, 'status', 0) === 2) {
      label = 'Job In Progress';
    } else if (get(chat.jobDetails, 'status', 0) === 3) {
      label = 'Job Completed';
    } else if (get(chat.jobDetails, 'status', 0) === 4) {
      label = 'Job Cancelled';
    }
    return (
      <View style={styles.container}>
        {this.renderHeader()}
        <View style={styles.jobInfo}>
          <Text style={styles.greyText}>{label}</Text>
          <TouchableOpacity style={styles.detailsBtn} onPress={this.onJobDetails}>
            <Text style={styles.blueText}>Details</Text>
          </TouchableOpacity>
        </View>
        <ChatListView
          onSend={this.onSend}
          user={{
            _id: get(user, 'userInformation.id', 19971013),
            avatar: getAWSImageURL(get(user, 'userInformation.avatarLink', ''))
          }}
          chatHistory={chatHistory}
          loadMore={this.loadMore}
          isLoadingMore={isLoadingMore}
          isAvailableLoadMore={isAvailableLoadMore}
        />
      </View>
    );
  };

  render() {
    const { showIndicator } = this.state;
    return (
      <View style={styles.container}>
        {!showIndicator && this.renderMainContent()}
        {showIndicator && this.renderActivity()}
      </View>
    );
  }
}


const mapStateToProps = state => ({
  height: state.chat.height,
  ...chatSelector(state),
  ...userSelector(state),
  ...inboxSelector(state)
});

const mapDispatchToProps = dispatch => ({
  getChatHistory: (jobId, clientId, page) =>
    dispatch(ChatActions.getChatHistory(jobId, clientId, page)),
  sendChatMessage: (jobId, messageType, text) =>
    dispatch(ChatActions.sendChatMessage(jobId, messageType, text)),
  clearChat: () => dispatch(ChatActions.clearChat()),
  updateChat: (chatHistory, freelancerUnreadCount, freelancerSeen) =>
    dispatch(ChatActions.updateChat(chatHistory, freelancerUnreadCount, freelancerSeen)),
  getInboxData: () => dispatch(InboxActions.getInboxData()),
  updateCurrentScreen: newScreen => dispatch(RouteActions.updateCurrentScreen(newScreen)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Chat);
