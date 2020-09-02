import { StyleSheet } from 'react-native';
import Colors from '../../themes/colors';
import AppConfig from '../../config/appConfig';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    height: 100,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: Colors.darkGrey,
  },
  backContainer: {
    position: 'absolute',
    top: 5,
    left: 20,
    width: 30,
    height: 40,
    justifyContent: 'center'
  },
  headerText: {
    fontFamily: AppConfig.fontFamily,
    fontSize: 17,
    fontWeight: 'bold',
  },
  adressWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  subHeaderText1: {
    fontFamily: AppConfig.fontFamily,
    fontSize: 11,
    marginBottom: 4,
  },
  subHeaderText: {
    fontFamily: AppConfig.fontFamily,
    fontSize: 11,
  },
  thirdHeaderText: {
    fontFamily: AppConfig.fontFamily,
    fontSize: 10,
    marginTop: 2,
  },
  jobInfo: {
    height: 40,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: Colors.darkGrey,
  },
  greyText: {
    fontFamily: AppConfig.fontFamily,
    fontSize: 13,
    color: Colors.darkGrey,
    fontWeight: '400',
  },
  blueText: {
    fontFamily: AppConfig.fontFamily,
    fontSize: 13,
    color: Colors.lightBlue,
    fontWeight: '400',
  },
  activityContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  detailsBtn: {
    paddingLeft: 10
  }
});
